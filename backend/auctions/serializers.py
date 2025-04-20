from rest_framework import serializers
from .models import Auction, Bid
from django.utils import timezone
from django.core.exceptions import ValidationError
from decimal import Decimal

class BidSerializer(serializers.ModelSerializer):
    bidder_name = serializers.CharField(source='bidder.username', read_only=True)

    class Meta:
        model = Bid
        fields = ['id', 'amount', 'created_at', 'bidder_name']
        read_only_fields = ['created_at', 'bidder']

    def validate_amount(self, value):
        auction = self.context['auction']
        if value <= auction.current_price:
            raise serializers.ValidationError(
                'Ставка должна быть выше текущей цены'
            )
        min_increment = max(Decimal('0.01'), auction.current_price * Decimal('0.05'))
        if value < (auction.current_price + min_increment):
            raise serializers.ValidationError(
                f'Минимальное повышение ставки: {min_increment:.2f}'
            )
        return value

class AuctionSerializer(serializers.ModelSerializer):
    current_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    creator_name = serializers.CharField(
        source='creator.username',
        read_only=True
    )
    bids = BidSerializer(many=True, read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Auction
        fields = [
            'id', 'title', 'description', 'starting_price',
            'current_price', 'creator_name', 'start_date',
            'end_date', 'is_active', 'bids', 'image', 'image_url'
        ]

    def get_image_url(self, obj):
        if obj.image:
            return self.context['request'].build_absolute_uri(obj.image.url)
        return None

    def validate(self, data):
        # Проверка дат
        if data.get('start_date') and data.get('end_date'):
            if data['start_date'] >= data['end_date']:
                raise serializers.ValidationError(
                    'Дата окончания должна быть позже даты начала'
                )

            now = timezone.now()
            if data['start_date'] < now:
                raise serializers.ValidationError(
                    'Дата начала не может быть в прошлом'
                )

            duration = data['end_date'] - data['start_date']
            if duration.days > 30:
                raise serializers.ValidationError(
                    'Максимальная продолжительность аукциона - 30 дней'
                )

        # Проверка начальной цены
        if data.get('starting_price') and data['starting_price'] <= 0:
            raise serializers.ValidationError(
                'Начальная цена должна быть больше 0'
            )

        return data