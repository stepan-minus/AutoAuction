from django.db.models.signals import post_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import json

from .models import Message, Conversation
from .serializers import MessageSerializer

@receiver(post_save, sender=Message)
def message_created(sender, instance, created, **kwargs):
    """
    Обрабатывает создание нового сообщения и отправляет его по WebSocket
    """
    if created:
        # Создаем сериализатор для сообщения
        serializer = MessageSerializer(instance)
        message_data = serializer.data
        
        # Получаем группу чата для отправки сообщения
        conversation_id = str(instance.conversation.id)
        
        # Отправляем сообщение в группу чата через WebSocket
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"chat_{conversation_id}",
            {
                "type": "chat_message",
                "message": message_data
            }
        )
        
        # Также отправляем уведомление всем участникам
        for participant in instance.conversation.participants.all():
            if participant != instance.sender:
                async_to_sync(channel_layer.group_send)(
                    f"user_{participant.id}",
                    {
                        "type": "new_message_notification",
                        "message": {
                            "conversation_id": instance.conversation.id,
                            "sender_name": instance.sender.username,
                            "content": instance.content[:50] + ('...' if len(instance.content) > 50 else ''),
                            "timestamp": instance.timestamp.isoformat()
                        }
                    }
                )