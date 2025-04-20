import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Car, Bid
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()
logger = logging.getLogger(__name__)

class AuctionConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        try:
            self.auction_id = self.scope['url_route']['kwargs']['auction_id']
            self.auction_group_name = f'auction_{self.auction_id}'

            logger.info(f"Attempting to connect to auction {self.auction_id}")
            logger.debug(f"Connection scope: {self.scope}")

            # Join auction group
            await self.channel_layer.group_add(
                self.auction_group_name,
                self.channel_name
            )

            await self.accept()

            # Send current auction state to the newly connected client
            car = await self.get_car(self.auction_id)
            if car:
                logger.info(f"Sending initial state for auction {self.auction_id}")
                await self.send(text_data=json.dumps({
                    'type': 'auction_state',
                    'car_id': car['id'],
                    'current_price': float(car['current_price']),
                    'status': car['status'],
                    'time_remaining': car['time_remaining'],
                }))
            else:
                logger.warning(f"Car not found for auction {self.auction_id}")
        except Exception as e:
            logger.error(f"Error in connect for auction {self.auction_id}: {str(e)}")
            raise

    async def disconnect(self, close_code):
        try:
            # Leave auction group
            await self.channel_layer.group_discard(
                self.auction_group_name,
                self.channel_name
            )
            logger.info(f"Disconnected from auction {self.auction_id} with code {close_code}")
        except Exception as e:
            logger.error(f"Error in disconnect for auction {self.auction_id}: {str(e)}")

    async def receive(self, text_data):
        try:
            # Parse the received data
            data = json.loads(text_data)
            logger.debug(f"Received message for auction {self.auction_id}: {data}")

            # Handle different types of messages
            message_type = data.get('type')
            if message_type == 'bid':
                # Handle bid message
                await self.channel_layer.group_send(
                    self.auction_group_name,
                    {
                        'type': 'bid_message',
                        'message': data
                    }
                )
        except Exception as e:
            logger.error(f"Error in receive for auction {self.auction_id}: {str(e)}")

    async def bid_update(self, event):
        try:
            # Forward the bid update to WebSocket
            await self.send(text_data=event['message'])
            logger.debug(f"Sent bid update for auction {self.auction_id}")
        except Exception as e:
            logger.error(f"Error in bid_update for auction {self.auction_id}: {str(e)}")

    @database_sync_to_async
    def get_car(self, car_id):
        try:
            car = Car.objects.get(id=car_id)
            return {
                'id': car.id,
                'current_price': car.current_price,
                'status': car.status,
                'time_remaining': car.time_remaining(),
            }
        except Car.DoesNotExist:
            logger.warning(f"Car {car_id} not found")
            return None
        except Exception as e:
            logger.error(f"Error getting car {car_id}: {str(e)}")
            return None

class AuctionsConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        try:
            self.group_name = 'auctions'
            logger.info("Attempting to connect to auctions group")

            # Join auctions group
            await self.channel_layer.group_add(
                self.group_name,
                self.channel_name
            )

            await self.accept()
        except Exception as e:
            logger.error(f"Error in connect for auctions: {str(e)}")
            raise

    async def disconnect(self, close_code):
        try:
            # Leave auctions group
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )
            logger.info(f"Disconnected from auctions with code {close_code}")
        except Exception as e:
            logger.error(f"Error in disconnect for auctions: {str(e)}")

    async def auction_update(self, event):
        try:
            # Forward the auction update to WebSocket
            await self.send(text_data=event['message'])
            logger.debug("Sent auction update to all connected clients")
        except Exception as e:
            logger.error(f"Error in auction_update: {str(e)}")


class NotificationsConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        try:
            self.user = self.scope.get('user', None)
            
            # Проверяем аутентификацию пользователя
            if self.user and self.user.is_authenticated:
                # Имя группы уведомлений для этого пользователя
                self.notification_group_name = f'notifications_{self.user.id}'
                
                logger.info(f"Attempting to connect to notifications for user {self.user.id}")
                
                # Присоединяемся к группе уведомлений для этого пользователя
                await self.channel_layer.group_add(
                    self.notification_group_name,
                    self.channel_name
                )
                
                await self.accept()
                logger.info(f"Connection accepted for user {self.user.id}")
            else:
                # Если пользователь не аутентифицирован, отклоняем соединение
                logger.warning("Rejecting unauthenticated notifications connection")
                await self.close()
        except Exception as e:
            logger.error(f"Error in connect for notifications: {str(e)}")
            
    async def disconnect(self, close_code):
        try:
            if hasattr(self, 'notification_group_name'):
                # Покидаем группу уведомлений при отключении
                await self.channel_layer.group_discard(
                    self.notification_group_name,
                    self.channel_name
                )
                logger.info(f"Disconnected from notifications with code {close_code}")
        except Exception as e:
            logger.error(f"Error in disconnect for notifications: {str(e)}")
            
    async def receive(self, text_data):
        # Для уведомлений обычно не нужно обрабатывать входящие сообщения от клиентов
        logger.info(f"Received message for notifications: {text_data}")
            
    async def notification_update(self, event):
        try:
            # Отправляем уведомление пользователю
            await self.send(text_data=event['message'])
            
            # Извлекаем тип уведомления для логирования
            try:
                message_data = json.loads(event['message'])
                notification_type = message_data.get('type', 'unknown')
                logger.info(f"Sent {notification_type} notification to user {self.user.id if self.user else 'unknown'}")
            except:
                logger.info(f"Sent notification update to user {self.user.id if self.user else 'unknown'}")
        except Exception as e:
            logger.error(f"Error in notification_update: {str(e)}")
            
    async def auction_won_notification(self, event):
        """Обработчик уведомления о победе в аукционе"""
        try:
            # Формируем сообщение о победе
            message = {
                'type': 'auction_won',
                'user_id': event.get('user_id'),
                'car_id': event.get('car_id'),
                'car_brand': event.get('car_brand'),
                'car_model': event.get('car_model'),
                'final_price': event.get('final_price'),
                'seller_id': event.get('seller_id'),
                'timestamp': timezone.now().isoformat()
            }
            
            # Отправляем уведомление клиенту
            await self.send(text_data=json.dumps(message))
            logger.info(f"Sent auction_won notification to user {event.get('user_id')}")
        except Exception as e:
            logger.error(f"Error in auction_won_notification: {str(e)}")
            
    async def outbid_notification(self, event):
        """Обработчик уведомления о перебитой ставке"""
        try:
            # Формируем сообщение о перебитой ставке
            message = {
                'type': 'outbid_notification',
                'car_id': event.get('car_id'),
                'car_brand': event.get('car_brand'),
                'car_model': event.get('car_model'),
                'previous_amount': event.get('previous_amount'),
                'new_amount': event.get('new_amount'),
                'bidder_id': event.get('bidder_id'),
                'bidder_username': event.get('bidder_username'),
                'timestamp': timezone.now().isoformat()
            }
            
            # Отправляем уведомление клиенту
            await self.send(text_data=json.dumps(message))
            logger.info(f"Sent outbid_notification to user {self.user.id if self.user else 'unknown'}")
        except Exception as e:
            logger.error(f"Error in outbid_notification: {str(e)}")