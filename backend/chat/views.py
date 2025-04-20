from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from django.db.models import Q
from django.shortcuts import get_object_or_404

from .models import Conversation, Message
from .serializers import ConversationSerializer, ConversationDetailSerializer, MessageSerializer
from auction.models import Car

class IsParticipant(permissions.BasePermission):
    """Разрешение для проверки, является ли пользователь участником диалога"""
    
    def has_object_permission(self, request, view, obj):
        return obj.participants.filter(id=request.user.id).exists()

class ConversationListView(generics.ListAPIView):
    """Получение списка диалогов пользователя"""
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        # Используем distinct для исключения дублирования диалогов
        return Conversation.objects.filter(participants=user).distinct().order_by('-updated_at')
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        return context
        
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        serializer = self.get_serializer(queryset, many=True)
        # Возвращаем просто массив диалогов без обертки - это соответствует REST API стандартам
        # и ожиданиям frontend части
        return Response(serializer.data)

class ConversationDetailView(generics.RetrieveAPIView):
    """Получение детальной информации о диалоге"""
    serializer_class = ConversationDetailSerializer
    permission_classes = [permissions.IsAuthenticated, IsParticipant]
    queryset = Conversation.objects.all()
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        return context
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Отметить все сообщения в диалоге как прочитанные для текущего пользователя
        Message.objects.filter(
            conversation=instance,
            is_read=False
        ).exclude(sender=request.user).update(is_read=True)
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

class MessageCreateView(generics.CreateAPIView):
    """Создание нового сообщения в диалоге"""
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        return context
    
    def perform_create(self, serializer):
        conversation_id = self.kwargs.get('conversation_id')
        conversation = get_object_or_404(Conversation, id=conversation_id)
        
        # Проверка, является ли пользователь участником диалога
        if not conversation.participants.filter(id=self.request.user.id).exists():
            return Response(
                {"error": "Вы не являетесь участником этого диалога."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Сохраняем сообщение, добавляя conversation без требования его из запроса
        message = serializer.save(conversation=conversation, sender=self.request.user)
        
        # Обновить дату последнего сообщения
        conversation.save()  # Это обновит auto_now поле
        
        return message

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def start_conversation(request, car_id):
    """Создание нового диалога для обсуждения аукциона"""
    car = get_object_or_404(Car, id=car_id)
    
    # Упрощаем доступ - временно отключаем проверку на продавца/участника
    user = request.user
    # if user != car.seller and not car.bids.filter(bidder=user).exists():
    #     return Response(
    #         {"error": "Вы должны быть продавцом или участником торгов, чтобы начать диалог."},
    #         status=status.HTTP_403_FORBIDDEN
    #     )
    
    # Проверка существующего диалога между текущим пользователем и продавцом по этому автомобилю
    seller = car.seller
    
    # Если пользователь сам является продавцом, предотвращаем создание диалога с самим собой
    if user == seller:
        return Response(
            {"error": "Вы не можете создать диалог с самим собой."},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Поиск существующих диалогов: проверяем по двум критериям
    # 1. Ищем диалоги по текущему автомобилю и участникам (пользователь и продавец)
    car_dialogs = Conversation.objects.filter(car=car)
    
    # Выполняем поиск диалога, где оба пользователя являются участниками
    existing_car_dialogs = car_dialogs.filter(participants=user).filter(participants=seller)
    
    if existing_car_dialogs.exists():
        # Используем существующий диалог для этого автомобиля
        conversation = existing_car_dialogs.first()
        print(f"Найден существующий диалог по автомобилю: {conversation.id}")
        serializer = ConversationDetailSerializer(conversation, context={'request': request})
        return Response(serializer.data)
    
    # 2. Если диалог по автомобилю не найден, проверяем любые диалоги между этими пользователями
    user_conversations = Conversation.objects.filter(participants=user)
    general_dialogs = user_conversations.filter(participants=seller)
    
    if general_dialogs.exists():
        # Берем первый найденный диалог с продавцом
        conversation = general_dialogs.first()
        print(f"Найден общий диалог между пользователями: {conversation.id}, связываем с автомобилем {car.id}")
        
        # Обновляем информацию о связанном автомобиле
        conversation.car = car
        conversation.save()
        
        # Добавляем сообщение о новом автомобиле
        Message.objects.create(
            conversation=conversation,
            sender=user,
            content=f"Обсуждение аукциона: {car.brand} {car.model} ({car.year})"
        )
        
        serializer = ConversationDetailSerializer(conversation, context={'request': request})
        return Response(serializer.data)
    
    # Создание нового диалога, если существующего не найдено
    conversation = Conversation.objects.create(car=car)
    
    # Добавить текущего пользователя и продавца как участников
    conversation.participants.add(user)
    if user != seller:
        conversation.participants.add(seller)
    
    # Добавляем первое сообщение в диалог
    Message.objects.create(
        conversation=conversation,
        sender=user,
        content=f"Обсуждение аукциона: {car.brand} {car.model} ({car.year})"
    )
    
    serializer = ConversationDetailSerializer(conversation, context={'request': request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)