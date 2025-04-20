from django.utils import timezone
from django.db.models import Q

def get_highest_bid(car):
    """
    Получает самую высокую ставку для указанного автомобиля
    """
    return car.bids.order_by('-amount').first()

def complete_expired_auctions():
    """
    Завершает аукционы, которые истекли
    """
    from .models import Car, AuctionHistory
    
    now = timezone.now()
    
    # Находим все активные аукционы, срок которых истек
    expired_auctions = Car.objects.filter(
        status='active',
        end_time__lte=now
    )
    
    count = 0
    for car in expired_auctions:
        # Меняем статус на "completed"
        car.status = 'completed'
        car.save(update_fields=['status'])
        
        # Получаем последнюю ставку (если есть)
        highest_bid = get_highest_bid(car)
        
        # Создаем историю аукциона, если её еще нет
        if not hasattr(car, 'auction_history'):
            AuctionHistory.objects.create(
                car=car,
                winner=highest_bid.bidder if highest_bid else None,
                final_price=highest_bid.amount if highest_bid else car.current_price,
                ended_at=now
            )
        
        count += 1
    
    return count