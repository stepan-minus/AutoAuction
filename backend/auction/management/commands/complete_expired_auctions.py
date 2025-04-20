from django.core.management.base import BaseCommand
from django.utils import timezone
from auction.models import Car, AuctionHistory
from auction.utils import get_highest_bid

class Command(BaseCommand):
    help = 'Завершение аукционов, срок которых истек'

    def handle(self, *args, **options):
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
            highest_bid = car.bids.order_by('-amount').first()
            
            # Создаем историю аукциона, если её еще нет
            if not hasattr(car, 'auction_history'):
                AuctionHistory.objects.create(
                    car=car,
                    winner=highest_bid.bidder if highest_bid else None,
                    final_price=highest_bid.amount if highest_bid else car.current_price,
                    ended_at=now
                )
            
            count += 1
        
        self.stdout.write(
            self.style.SUCCESS(f'Успешно завершено {count} истекших аукционов')
        )