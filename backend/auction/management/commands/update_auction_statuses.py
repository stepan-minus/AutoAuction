from django.core.management.base import BaseCommand
from django.utils import timezone
from auction.models import Car

class Command(BaseCommand):
    help = 'Update auction statuses based on start and end times'

    def handle(self, *args, **options):
        now = timezone.now()
        activated_count = 0
        completed_count = 0
        
        # Activate pending auctions
        pending_auctions = Car.objects.filter(
            status='pending', 
            start_time__lte=now
        )
        
        for auction in pending_auctions:
            auction.status = 'active'
            auction.save(update_fields=['status'])
            activated_count += 1
        
        # Complete active auctions that have ended
        active_auctions = Car.objects.filter(
            status='active', 
            end_time__lte=now
        )
        
        for auction in active_auctions:
            auction.status = 'completed'
            auction.save(update_fields=['status'])
            completed_count += 1
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully updated auctions: {activated_count} activated, {completed_count} completed'
            )
        )