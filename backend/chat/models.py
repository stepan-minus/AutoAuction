from django.db import models
from django.conf import settings
from auction.models import Car

class Conversation(models.Model):
    """Модель для представления диалога между пользователями"""
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='conversations'
    )
    car = models.ForeignKey(
        Car, 
        on_delete=models.CASCADE,
        related_name='conversations',
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['-updated_at']),
            models.Index(fields=['car']),
        ]
    
    def __str__(self):
        usernames = ', '.join([user.username for user in self.participants.all()])
        return f"Диалог: {usernames} - {self.car}"

class Message(models.Model):
    """Модель для представления сообщения в диалоге"""
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_messages'
    )
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['timestamp']
    
    def __str__(self):
        return f"{self.sender.username}: {self.content[:50]}"