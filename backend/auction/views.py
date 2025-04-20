from django.utils import timezone
from django.db.models import Q
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser, FormParser
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import json
import logging
from decimal import Decimal

logger = logging.getLogger(__name__) # Assuming logger is configured elsewhere

from .models import Car, Bid, AuctionHistory, CarImage
from .utils import complete_expired_auctions
from .serializers import (
    CarListSerializer, CarDetailSerializer, BidSerializer,
    AuctionHistorySerializer, CarImageSerializer
)

# Custom pagination for cars
class CarPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50

# Permission classes
class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.seller == request.user

# Представления для тегов и способов оплаты удалены

class CarListCreateView(generics.ListCreateAPIView):
    serializer_class = CarDetailSerializer
    pagination_class = CarPagination
    parser_classes = (MultiPartParser, FormParser)

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]
        
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({'request': self.request})
        return context

    def get_queryset(self):
        return Car.objects.filter(status__in=['active', 'pending'])

    def perform_create(self, serializer):
        try:
            serializer.save(seller=self.request.user)
        except Exception as e:
            logger.error(f"Error creating car auction: {str(e)}")
            raise serializers.ValidationError("Ошибка при создании аукциона. Пожалуйста, проверьте введенные данные.")

class CarFilterView(generics.ListAPIView):
    serializer_class = CarListSerializer
    permission_classes = [permissions.AllowAny]  # Изменено для публичного доступа
    pagination_class = CarPagination
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({'request': self.request})
        return context

    def get_queryset(self):
        # Сначала проверим и завершим все истекшие аукционы
        complete_expired_auctions()
        
        queryset = Car.objects.all()

        # Filter by price range
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        if min_price:
            queryset = queryset.filter(current_price__gte=min_price)
        if max_price:
            queryset = queryset.filter(current_price__lte=max_price)

        # Фильтрация по тегам и способам оплаты удалена

        # Filter by seller loyalty/rating
        min_rating = self.request.query_params.get('min_rating')
        if min_rating:
            queryset = queryset.filter(seller__profile__rating__gte=min_rating)

        # Search by keyword in brand, model or description
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(brand__icontains=search) | 
                Q(model__icontains=search) | 
                Q(description__icontains=search)
            )

        # Sort by price
        sort = self.request.query_params.get('sort')
        if sort == 'price_asc':
            queryset = queryset.order_by('current_price')
        elif sort == 'price_desc':
            queryset = queryset.order_by('-current_price')
        else:
            # Default sort by created date (newest first)
            queryset = queryset.order_by('-created_at')

        # Filter by status
        status_filter = self.request.query_params.get('status')
        now = timezone.now()
        
        if status_filter:
            if status_filter == 'active':
                # For active auctions, also check if they are not expired
                queryset = queryset.filter(status='active', end_time__gt=now)
            elif status_filter == 'completed':
                # Show completed auctions
                queryset = queryset.filter(status='completed')
            elif status_filter == 'cancelled':
                # Show cancelled auctions
                queryset = queryset.filter(status='cancelled')
            elif status_filter == 'all':
                # Show all auctions regardless of status
                pass
            else:
                queryset = queryset.filter(status=status_filter)
        else:
            # Default to only active and non-expired auctions
            queryset = queryset.filter(status='active', end_time__gt=now)

        return queryset

class CarDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Car.objects.all()
    serializer_class = CarDetailSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({'request': self.request})
        return context

    def perform_update(self, serializer):
        car = self.get_object()
        if car.status == 'completed' or car.status == 'cancelled':
            raise ValidationError("You cannot edit completed or cancelled auctions")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.status == 'completed' or instance.status == 'cancelled':
            raise ValidationError("You cannot delete completed or cancelled auctions")
        instance.delete()

class BidListView(generics.ListAPIView):
    serializer_class = BidSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({'request': self.request})
        return context

    def get_queryset(self):
        car_id = self.kwargs.get('car_id')
        return Bid.objects.filter(car_id=car_id).order_by('-amount')

class BidCreateView(generics.CreateAPIView):
    serializer_class = BidSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({'request': self.request})
        return context

    def perform_create(self, serializer):
        car_id = serializer.validated_data['car'].id
        amount = serializer.validated_data['amount']

        try:
            car = Car.objects.get(id=car_id)
            
            # Все валидации теперь выполняются в сериализаторе BidSerializer
            # Включая проверки:
            # - Активность аукциона
            # - Нельзя ставить на свой аукцион 
            # - Нельзя перебивать свою ставку
            # - Сумма ставки должна быть не меньше min_required
            
            # Создаем ставку
            bid = serializer.save(bidder=self.request.user)
            
            # Обновляем текущую цену аукциона
            car.current_price = amount
            car.save()

            # Подготовка данных для отправки через WebSocket
            bid_data = {
                'type': 'bid_update',
                'bid': {
                    'id': bid.id,
                    'amount': float(amount),
                    'created_at': timezone.now().isoformat(),
                    'bidder': {
                        'id': self.request.user.id,
                        'username': self.request.user.username
                    }
                },
                'car_id': car.id,
                'current_price': float(car.current_price),
            }

            # Send real-time update via WebSocket to all auction viewers
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"auction_{car.id}",
                {
                    'type': 'bid_update',
                    'message': json.dumps(bid_data)
                }
            )
            
            # Получаем предыдущую ставку, чтобы отправить уведомление
            previous_bid = Bid.objects.filter(car_id=car.id).exclude(bidder=self.request.user).order_by('-created_at').first()
            
            # Если была предыдущая ставка от другого пользователя, отправляем уведомление
            if previous_bid:
                # Send outbid notification to the user through auction notifications
                async_to_sync(channel_layer.group_send)(
                    f"notifications_{previous_bid.bidder.id}",
                    {
                        'type': 'notification_update',
                        'message': json.dumps({
                            'type': 'outbid',
                            'user_id': previous_bid.bidder.id,
                            'car_id': car.id,
                            'car_brand': car.brand,
                            'car_model': car.model,
                            'amount': float(amount),
                            'timestamp': timezone.now().isoformat(),
                        })
                    }
                )
                
                # Also send to user's chat notifications
                async_to_sync(channel_layer.group_send)(
                    f"user_{previous_bid.bidder.id}",
                    {
                        'type': 'auction_outbid_notification',
                        'user_id': previous_bid.bidder.id,
                        'car_id': car.id,
                        'car_brand': car.brand,
                        'car_model': car.model,
                        'new_bid_amount': float(amount)
                    }
                )

        except Car.DoesNotExist:
            raise ValidationError({'error': 'Car not found'})
        except ValueError:
            raise ValidationError({'error': 'Invalid bid amount'})
        except Exception as e:
            logger.exception(f"Error creating bid: {str(e)}") # Log the exception for debugging
            raise ValidationError({'error': 'Failed to place bid'})



class CarImageView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CarImageSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)
    queryset = CarImage.objects.all()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({'request': self.request})
        return context
    
    def check_object_permissions(self, request, obj):
        # Проверяем, что пользователь является владельцем автомобиля
        if obj.car.seller != request.user:
            self.permission_denied(
                request, message="You do not have permission to modify this image."
            )
        super().check_object_permissions(request, obj)
    
    def perform_update(self, serializer):
        image = self.get_object()
        if image.car.status == 'completed' or image.car.status == 'cancelled':
            raise ValidationError("You can only edit images for active auctions")
        serializer.save()
    
    def perform_destroy(self, instance):
        if instance.car.status == 'completed' or instance.car.status == 'cancelled':
            raise ValidationError("You can only delete images for active auctions")
        instance.delete()


class CarImageSetPrimaryView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        try:
            image = CarImage.objects.get(pk=pk)
            
            # Проверка прав доступа
            if image.car.seller != request.user:
                return Response(
                    {"error": "You do not have permission to modify this image"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Проверка статуса аукциона
            if image.car.status == 'completed' or image.car.status == 'cancelled':
                return Response(
                    {"error": "You can only modify images for active auctions"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Установка изображения как основного
            image.is_primary = True
            image.save()  # save() автоматически сбросит is_primary у других изображений
            
            return Response({"success": True}, status=status.HTTP_200_OK)
        
        except CarImage.DoesNotExist:
            return Response(
                {"error": "Image not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.exception(f"Error setting primary image: {str(e)}")
            return Response(
                {"error": "Failed to set primary image"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AuctionHistoryView(generics.ListAPIView):
    serializer_class = AuctionHistorySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({'request': self.request})
        return context

    def get_queryset(self):
        # Сначала проверим и завершим все истекшие аукционы
        complete_expired_auctions()
        
        car_id = self.kwargs.get('car_id')
        user = self.request.user

        if car_id:
            return AuctionHistory.objects.filter(car_id=car_id)

        # Return auction history for cars owned or won by the user
        return AuctionHistory.objects.filter(
            Q(car__seller=user) | Q(winner=user)
        )