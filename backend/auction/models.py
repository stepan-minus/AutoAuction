from django.db import models
from django.utils import timezone
from django.conf import settings
from django.core.validators import MinValueValidator
from decimal import Decimal

class Car(models.Model):
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )

    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='cars')
    brand = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    year = models.PositiveIntegerField()
    mileage = models.PositiveIntegerField(null=True, blank=True, default=0)  # Make mileage optional with default
    description = models.TextField()
    starting_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0.01)])
    current_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0.01)], null=True, blank=True)
    min_bid_increment = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0.01)], default=100.00)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField()
    image = models.ImageField(upload_to='cars/', null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.brand} {self.model} ({self.year})"
    
    def save(self, *args, **kwargs):
        # Если текущая цена не установлена, устанавливаем ее равной начальной цене
        if not self.current_price:
            self.current_price = self.starting_price
        
        # Если это новый объект (без ID) или start_time пустой, устанавливаем start_time равным текущему времени
        if not self.pk or not self.start_time:
            self.start_time = timezone.now()
            
        super().save(*args, **kwargs)

    def is_active(self):
        now = timezone.now()
        # Аукцион активен, если его статус 'active' и время окончания еще не наступило
        return self.status == 'active' and now <= self.end_time
    
    def time_remaining(self):
        if self.status != 'active':
            return 0
        now = timezone.now()
        if now > self.end_time:
            return 0
        return int((self.end_time - now).total_seconds())

class Bid(models.Model):
    car = models.ForeignKey(Car, on_delete=models.CASCADE, related_name='bids')
    bidder = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bids')
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0.01)])
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-amount']
    
    def __str__(self):
        return f"{self.bidder.username} bid ${self.amount} on {self.car}"

class CarImage(models.Model):
    car = models.ForeignKey(Car, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='cars/')
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-is_primary', '-created_at']
    
    def __str__(self):
        return f"Image for {self.car} {'(Primary)' if self.is_primary else ''}"
    
    def save(self, *args, **kwargs):
        # Если это основное изображение, убедимся, что другие изображения этого автомобиля не основные
        if self.is_primary:
            CarImage.objects.filter(car=self.car, is_primary=True).update(is_primary=False)
        super().save(*args, **kwargs)


class AuctionHistory(models.Model):
    car = models.OneToOneField(Car, on_delete=models.CASCADE, related_name='auction_history')
    winner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='won_auctions')
    final_price = models.DecimalField(max_digits=10, decimal_places=2)
    ended_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-ended_at']
        verbose_name_plural = 'Auction histories'
    
    def __str__(self):
        winner_name = self.winner.username if self.winner else "No winner"
        return f"{self.car} - Winner: {winner_name} - Final price: ${self.final_price}"