import json
import datetime
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Conversation, Message
from .serializers import MessageSerializer

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.room_group_name = f'chat_{self.conversation_id}'
        
        # Проверка, является ли пользователь участником диалога
        if not await self.is_conversation_participant():
            await self.close()
            return
        
        # Присоединение к группе комнаты
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        # Присоединение к персональной группе для уведомлений
        self.user_group_name = f'user_{self.user.id}'
        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )
        
        await self.accept()
    
    async def disconnect(self, close_code):
        # Покидание группы комнаты
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        
        # Покидание персональной группы для уведомлений
        await self.channel_layer.group_discard(
            self.user_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type', 'message')
            
            if message_type == 'message':
                # Обработка нового сообщения
                content = text_data_json.get('content')
                temp_id = text_data_json.get('temp_id', None)
                
                if content:
                    # Сохранение сообщения в базу данных
                    message = await self.save_message(content)
                    
                    # Немедленная отправка сообщения всем участникам
                    # Сериализуем сообщение для отправки
                    serializer = await self.serialize_message(message)
                    
                    # Добавим информацию о временном ID, если он был передан
                    if temp_id:
                        serializer['temp_id'] = temp_id
                    
                    # Немедленно отправляем подтверждение отправителю
                    await self.send(text_data=json.dumps({
                        'type': 'message_sent',
                        'message': serializer,
                        'status': 'success'
                    }))
                    
                    # Отправляем сообщение всем участникам диалога
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            "type": "chat_message",
                            "message": serializer
                        }
                    )
            
            elif message_type == 'chat_message':
                # Обрабатываем сообщение, если оно пришло через метод нативного WebSocket
                # в некоторых клиентах
                content = text_data_json.get('message')
                temp_id = text_data_json.get('temp_id', None)
                
                if content:
                    # Сохранение сообщения в базу данных
                    message = await self.save_message(content)
                    
                    # Сериализуем сообщение для отправки
                    serializer = await self.serialize_message(message)
                    
                    # Добавим информацию о временном ID, если он был передан
                    if temp_id:
                        serializer['temp_id'] = temp_id
                    
                    # Отправляем сообщение всем участникам диалога
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            "type": "chat_message",
                            "message": serializer
                        }
                    )
            
            elif message_type == 'ping':
                # Отвечаем на ping сообщения для поддержания соединения
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': json.dumps(str(datetime.datetime.now()))
                }))
        except Exception as e:
            # Отправляем информацию об ошибке клиенту
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': str(e),
                'status': 'error'
            }))
    
    async def chat_message(self, event):
        # Получаем данные из сообщения
        message = event['message']
        
        # Если отправитель - текущий пользователь, проверяем чтобы не отправлять ему же
        if message.get('sender') and message['sender'].get('id') == self.user.id:
            # Пропускаем отправку - чтобы предотвратить дублирование у отправителя
            # Сообщение уже отображается в интерфейсе
            return
            
        # Отправка сообщения клиенту
        await self.send(text_data=json.dumps({
            'type': 'message',
            'message': message
        }))
    
    async def new_message_notification(self, event):
        # Отправка уведомления о новом сообщении
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'message': event['message']
        }))
    
    @database_sync_to_async
    def is_conversation_participant(self):
        try:
            conversation = Conversation.objects.get(id=self.conversation_id)
            return conversation.participants.filter(id=self.user.id).exists()
        except Conversation.DoesNotExist:
            return False
    
    @database_sync_to_async
    def save_message(self, content):
        conversation = Conversation.objects.get(id=self.conversation_id)
        message = Message.objects.create(
            conversation=conversation,
            sender=self.user,
            content=content
        )
        return message
        
    @database_sync_to_async
    def serialize_message(self, message):
        """Сериализует модель сообщения в JSON-совместимый формат для отправки через WebSocket"""
        serializer = MessageSerializer(message)
        return serializer.data

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        
        if not self.user.is_authenticated:
            await self.close()
            return
            
        self.user_group_name = f'user_{self.user.id}'
        
        # Присоединение к персональной группе для уведомлений
        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )
        
        await self.accept()
    
    async def disconnect(self, close_code):
        # Покидание персональной группы для уведомлений
        if hasattr(self, 'user_group_name'):
            await self.channel_layer.group_discard(
                self.user_group_name,
                self.channel_name
            )
    
    async def new_message_notification(self, event):
        # Отправка уведомления о новом сообщении
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'message': event['message']
        }))
    
    async def auction_outbid_notification(self, event):
        # Отправка уведомления о перебитой ставке
        await self.send(text_data=json.dumps({
            'type': 'outbid',
            'user_id': event.get('user_id'),
            'car_id': event.get('car_id'),
            'car_brand': event.get('car_brand'),
            'car_model': event.get('car_model'),
            'new_bid_amount': event.get('new_bid_amount')
        }))
    
    async def auction_won_notification(self, event):
        # Отправка уведомления о выигрыше аукциона
        await self.send(text_data=json.dumps({
            'type': 'auction_won',
            'winner_id': event.get('winner_id'),
            'car_id': event.get('car_id'),
            'car_brand': event.get('car_brand'),
            'car_model': event.get('car_model'),
            'final_price': event.get('final_price'),
            'conversation_id': event.get('conversation_id')
        }))
    
    async def auction_ended_notification(self, event):
        # Отправка уведомления о завершении аукциона продавцу
        await self.send(text_data=json.dumps({
            'type': 'auction_ended',
            'seller_id': event.get('seller_id'),
            'car_id': event.get('car_id'),
            'car_brand': event.get('car_brand'),
            'car_model': event.get('car_model'),
            'has_winner': event.get('has_winner'),
            'winner_name': event.get('winner_name'),
            'final_price': event.get('final_price'),
            'conversation_id': event.get('conversation_id')
        }))