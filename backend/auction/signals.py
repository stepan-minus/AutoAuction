from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Bid, Car, AuctionHistory
from django.utils import timezone
from django.db.models import Max

@receiver(post_save, sender=Bid)
def bid_created(sender, instance, created, **kwargs):
    """
    Signal to handle actions when a new bid is created
    """
    if created:
        # Update the current price of the car
        car = instance.car
        car.current_price = instance.amount
        car.save(update_fields=['current_price'])
        
        # Найти предыдущую максимальную ставку (если есть) для уведомления пользователя
        previous_bid = Bid.objects.filter(car=car).exclude(id=instance.id).order_by('-amount').first()
        
        # Если есть предыдущая ставка, отправляем уведомление ее создателю
        if previous_bid and previous_bid.bidder.id != instance.bidder.id:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            import json
            
            channel_layer = get_channel_layer()
            
            # Данные для уведомления о перебитой ставке
            outbid_notification = {
                'type': 'outbid_notification',
                'car_id': car.id, 
                'car_brand': car.brand,
                'car_model': car.model,
                'previous_amount': float(previous_bid.amount),
                'new_amount': float(instance.amount),
                'bidder_id': instance.bidder.id,
                'bidder_username': instance.bidder.username,
                'timestamp': timezone.now().isoformat()
            }
            
            # Отправка уведомления через канал уведомлений
            async_to_sync(channel_layer.group_send)(
                f"notifications_{previous_bid.bidder.id}",
                {
                    'type': 'notification_update',
                    'message': json.dumps(outbid_notification)
                }
            )

@receiver(post_save, sender=Car)
def car_status_changed(sender, instance, **kwargs):
    """
    Signal to handle actions when a car's status changes
    """
    # If a car auction has just completed, create auction history
    if instance.status == 'completed':
        now = timezone.now()
        
        # Get the highest bid (if any)
        highest_bid = instance.bids.order_by('-amount').first()
        
        # Create auction history
        history = None
        if not hasattr(instance, 'auction_history'):
            history = AuctionHistory.objects.create(
                car=instance,
                winner=highest_bid.bidder if highest_bid else None,
                final_price=highest_bid.amount if highest_bid else instance.current_price,
                ended_at=now
            )
            
            # Send notification to the winner if there is one
            if highest_bid and highest_bid.bidder:
                from channels.layers import get_channel_layer
                from asgiref.sync import async_to_sync
                import json
                
                winner = highest_bid.bidder
                channel_layer = get_channel_layer()
                
                # Подготовка данных для уведомления победителя
                notification_data = {
                    'type': 'auction_won',
                    'user_id': winner.id,
                    'car_id': instance.id,
                    'car_brand': instance.brand,
                    'car_model': instance.model,
                    'final_price': float(highest_bid.amount),
                    'timestamp': now.isoformat(),
                    'seller_id': instance.seller.id,
                }
                
                # Отправка уведомления через WebSocket
                async_to_sync(channel_layer.group_send)(
                    f"notifications_{winner.id}",
                    {
                        'type': 'notification_update',
                        'message': json.dumps(notification_data)
                    }
                )
                
                # Также отправляем в канал чат-уведомлений
                async_to_sync(channel_layer.group_send)(
                    f"user_{winner.id}",
                    {
                        'type': 'auction_won_notification',
                        'user_id': winner.id,
                        'car_id': instance.id,
                        'car_brand': instance.brand,
                        'car_model': instance.model,
                        'final_price': float(highest_bid.amount),
                        'seller_id': instance.seller.id
                    }
                )

# Убираем сигнал для активации аукционов, так как теперь они сразу становятся активными

@receiver(post_save, sender=Car)
def auto_complete_auction(sender, instance, **kwargs):
    """
    Signal to automatically complete auctions when end time is reached
    """
    now = timezone.now()
    
    # Завершаем аукцион только если:
    # 1. Статус 'active' (аукцион активен)
    # 2. Время окончания указано и уже наступило
    if instance.status == 'active' and instance.end_time and instance.end_time <= now:
        instance.status = 'completed'
        # Устанавливаем флаг update_fields, чтобы предотвратить зацикливание сигналов
        # и вызывать только нужные сигналы при сохранении
        instance.save(update_fields=['status'])