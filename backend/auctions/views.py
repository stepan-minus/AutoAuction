from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ValidationError
from .models import Auction, Bid
from .serializers import AuctionSerializer, BidSerializer
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

class AuctionViewSet(viewsets.ModelViewSet):
    serializer_class = AuctionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Auction.objects.filter(is_active=True)

    def perform_create(self, serializer):
        serializer.save(
            creator=self.request.user,
            current_price=serializer.validated_data['starting_price']
        )

    @action(detail=True, methods=['post'])
    def place_bid(self, request, pk=None):
        auction = self.get_object()
        
        # Validate auction status
        if not auction.is_active:
            return Response(
                {'error': 'Auction is not active'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = BidSerializer(
            data=request.data,
            context={'auction': auction}
        )

        if serializer.is_valid():
            bid = serializer.save(
                auction=auction,
                bidder=request.user
            )
            
            # Update auction current price
            auction.current_price = bid.amount
            auction.save()

            # Notify all clients about the new bid
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"auction_{auction.id}",
                {
                    "type": "auction_update",
                    "message": {
                        "auction_id": auction.id,
                        "current_price": str(auction.current_price),
                        "last_bid": BidSerializer(bid).data
                    }
                }
            )

            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )
