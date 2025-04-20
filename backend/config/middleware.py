import jwt
import logging
from channels.db import database_sync_to_async
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

User = get_user_model()

# Настройка логгера
logger = logging.getLogger('django')

@database_sync_to_async
def get_user(token_key):
    """
    Асинхронная функция для получения пользователя по JWT токену
    """
    try:
        # Пытаемся декодировать JWT токен
        UntypedToken(token_key)
        decoded_data = jwt.decode(token_key, settings.SECRET_KEY, algorithms=["HS256"])
        user_id = decoded_data.get('user_id')
        
        # Получаем пользователя
        if user_id:
            user = User.objects.get(id=user_id)
            logger.info(f"Successfully authenticated user {user.username} (ID: {user.id}) via WebSocket")
            return user
    except InvalidToken as e:
        logger.warning(f"Invalid JWT token: {str(e)}")
    except TokenError as e:
        logger.warning(f"JWT token error: {str(e)}")
    except User.DoesNotExist as e:
        logger.warning(f"User from JWT token not found: {str(e)}")
    except jwt.PyJWTError as e:
        logger.warning(f"JWT decoding error: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error during WebSocket authentication: {str(e)}")
    
    logger.info("WebSocket connection with anonymous user")
    return AnonymousUser()

class JWTAuthMiddleware:
    """
    JWT Authentication middleware для Channels
    """
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        # Получаем информацию о соединении для логирования
        connection_info = f"{scope.get('client', ['unknown'])[0]}:{scope.get('client', ['', 'unknown'])[1]}"
        path = scope.get('path', 'unknown')
        
        logger.info(f"WebSocket connection attempt from {connection_info} to {path}")
        
        # Получаем токен из параметров запроса
        query_string = scope.get('query_string', b'').decode()
        query_params = {}
        
        # Безопасно парсим параметры запроса
        try:
            if query_string:
                query_params = dict(param.split('=') for param in query_string.split('&') if param and '=' in param)
        except Exception as e:
            logger.warning(f"Error parsing query string: {str(e)}")
        
        token = query_params.get('token', None)
        
        # Если токен найден в запросе, логируем это
        if token:
            logger.info(f"Token provided in query string for {path}")

        # Если токен не найден в query параметрах, ищем в заголовках
        if not token and 'headers' in scope:
            headers = dict(scope['headers'])
            if b'authorization' in headers:
                try:
                    auth_header = headers[b'authorization'].decode()
                    if auth_header.startswith('Bearer '):
                        token = auth_header.split(' ')[1]
                        logger.info(f"Token provided in Authorization header for {path}")
                except Exception as e:
                    logger.warning(f"Error parsing Authorization header: {str(e)}")

        # Автентифицируем пользователя
        if token:
            scope['user'] = await get_user(token)
        else:
            logger.info(f"No JWT token provided for {path}, using anonymous user")
            scope['user'] = AnonymousUser()

        # Логируем результат аутентификации
        if scope['user'].is_authenticated:
            logger.info(f"Authenticated WebSocket connection from {connection_info} as user {scope['user'].username}")
        else:
            logger.info(f"Anonymous WebSocket connection from {connection_info}")

        # Передаем управление следующему middleware
        return await self.app(scope, receive, send)