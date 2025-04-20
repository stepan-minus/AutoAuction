from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator
from django.utils import timezone
from django.core.exceptions import ValidationError
from decimal import Decimal

User = get_user_model()

class Auction(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    image = models.ImageField(upload_to='auction_images/', null=True, blank=True)
    starting_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    current_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    creator = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_auctions'
    )
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def clean(self):
        if self.start_date and self.end_date:
            now = timezone.now()
            if self.start_date >= self.end_date:
                raise ValidationError('Дата окончания должна быть позже даты начала')
            if self.start_date < now:
                raise ValidationError('Дата начала не может быть в прошлом')
            if (self.end_date - self.start_date).days > 30:
                raise ValidationError('Максимальная продолжительность аукциона - 30 дней')

        if self.starting_price and self.starting_price <= 0:
            raise ValidationError('Начальная цена должна быть больше 0')

    def save(self, *args, **kwargs):
        if not self.current_price:
            self.current_price = self.starting_price
        self.full_clean()
        super().save(*args, **kwargs)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.current_price}"

class Bid(models.Model):
    auction = models.ForeignKey(
        Auction,
        on_delete=models.CASCADE,
        related_name='bids'
    )
    bidder = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='bids'
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-amount']

    def __str__(self):
        return f"{self.bidder.username} - {self.amount} на {self.auction.title}"