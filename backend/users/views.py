from django.contrib.auth import login, logout
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.contrib.auth.tokens import default_token_generator
from django.urls import reverse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.utils import timezone

import random
import string
from datetime import timedelta

def send_html_email(subject, html_content, from_email, recipient_list, fail_silently=False):
    """
    Отправка HTML-писем с обычным текстом в качестве запасного варианта
    """
    # Проверка настроек конфигурации перед отправкой
    print("\n===== ОТПРАВКА EMAIL =====")
    print(f"Subject: {subject}")
    print(f"From: {from_email}")
    print(f"To: {recipient_list}")
    print(f"EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
    print(f"EMAIL_HOST: {settings.EMAIL_HOST}")
    print(f"EMAIL_PORT: {settings.EMAIL_PORT}")
    print(f"EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
    print(f"EMAIL_USE_SSL: {settings.EMAIL_USE_SSL}")
    print(f"DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
    print(f"EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
    print(f"EMAIL_HOST_PASSWORD: {'настроен' if settings.EMAIL_HOST_PASSWORD else 'НЕ НАСТРОЕН'}")
    
    # Проверка, совпадает ли from_email с DEFAULT_FROM_EMAIL (важно для Gmail)
    if from_email != settings.DEFAULT_FROM_EMAIL:
        print(f"ВНИМАНИЕ: from_email ({from_email}) не совпадает с DEFAULT_FROM_EMAIL ({settings.DEFAULT_FROM_EMAIL})")
        # Используем DEFAULT_FROM_EMAIL вместо переданного from_email
        from_email = settings.DEFAULT_FROM_EMAIL
        print(f"Используем DEFAULT_FROM_EMAIL: {from_email}")
    
    # Gmail требует, чтобы from_email совпадал с EMAIL_HOST_USER
    if settings.EMAIL_HOST == 'smtp.gmail.com' and from_email != settings.EMAIL_HOST_USER:
        print(f"ВНИМАНИЕ: При использовании Gmail from_email ({from_email}) должен совпадать с EMAIL_HOST_USER ({settings.EMAIL_HOST_USER})")
        from_email = settings.EMAIL_HOST_USER
        print(f"Используем EMAIL_HOST_USER в качестве from_email: {from_email}")
    
    # Создаем текстовую версию из HTML с сохранением базового форматирования
    text_content = strip_tags(html_content)
    
    try:
        # Создаем объект сообщения
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=from_email,
            to=recipient_list
        )
        
        # Добавляем HTML-версию
        email.attach_alternative(html_content, "text/html")
        
        # Проверка подключения к SMTP серверу Gmail перед отправкой
        if 'smtp' in settings.EMAIL_BACKEND and settings.EMAIL_HOST == 'smtp.gmail.com':
            print("Проверка подключения к SMTP серверу Gmail...")
            try:
                import smtplib
                server = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT)
                server.ehlo()
                if settings.EMAIL_USE_TLS:
                    server.starttls()
                    server.ehlo()
                server.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)
                print("Соединение с Gmail SMTP сервером: Успешно!")
                server.quit()
            except Exception as smtp_error:
                print(f"Ошибка подключения к SMTP серверу Gmail: {str(smtp_error)}")
                print("Возможные причины:")
                print("1. Неверный логин или пароль")
                print("2. Для аккаунта с 2FA требуется использовать пароль приложения")
                print("3. Включена блокировка небезопасных приложений")
                print("Подробнее: https://support.google.com/mail/?p=BadCredentials")
                raise smtp_error
        
        # Пытаемся отправить
        result = email.send(fail_silently=fail_silently)
        print(f"Результат отправки: {result} ({'Успешно' if result else 'Неудачно'})")
        
        if 'filebased' in settings.EMAIL_BACKEND:
            print(f"В режиме тестирования письмо сохранено в {getattr(settings, 'EMAIL_FILE_PATH', 'неизвестно')}")
        elif result:
            print(f"Письмо успешно отправлено на {', '.join(recipient_list)}")
        
        print("===== ОТПРАВКА ЗАВЕРШЕНА =====\n")
        return result
    
    except Exception as e:
        print(f"ОШИБКА при отправке email: {str(e)}")
        if hasattr(e, '__dict__'):
            for key, value in e.__dict__.items():
                print(f"    {key}: {value}")
        
        # Подробное объяснение ошибок Gmail SMTP
        if 'smtp' in settings.EMAIL_BACKEND and '5.7.8' in str(e):
            print("\nЭто ошибка аутентификации Gmail. Возможные решения:")
            print("1. Проверьте правильность EMAIL_HOST_USER и EMAIL_HOST_PASSWORD")
            print("2. Если у вас включена двухфакторная аутентификация (2FA):")
            print("   - Создайте пароль приложения: https://myaccount.google.com/apppasswords")
            print("   - Используйте его вместо обычного пароля")
            print("3. Если 2FA не включена, разрешите доступ к небезопасным приложениям:")
            print("   - https://myaccount.google.com/lesssecureapps")
        
        print("===== ОШИБКА ОТПРАВКИ =====\n")
        if not fail_silently:
            raise
        return 0

from rest_framework import generics, status, permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.authentication import JWTAuthentication

from .models import User, SellerReview, EmailVerificationCode
from rest_framework import serializers as rest_serializers
from .serializers import (
    UserSerializer, UserDetailSerializer, RegisterSerializer, LoginSerializer,
    PasswordChangeSerializer, PasswordResetRequestSerializer, PasswordResetConfirmSerializer,
    SellerProfileSerializer, SellerReviewSerializer, EmailVerificationCodeSerializer,
    EmailVerificationRequestSerializer
)

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    
    def post(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            user = serializer.save()
            
            # Generate tokens
            refresh = RefreshToken.for_user(user)
            
            # Генерируем код подтверждения email и отправляем его
            verification_code = ''.join(random.choices('0123456789', k=6))
            expires_at = timezone.now() + timedelta(minutes=10)
            
            # Помечаем все предыдущие неиспользованные коды как использованные
            # (Хотя при регистрации еще не должно быть других кодов, но для надежности)
            EmailVerificationCode.objects.filter(
                user=user,
                is_used=False
            ).update(is_used=True)
            
            # Сохраняем код подтверждения
            verification = EmailVerificationCode.objects.create(
                user=user,
                code=verification_code,
                expires_at=expires_at
            )
            
            print(f"Создан новый код верификации при регистрации: {verification_code} для пользователя {user.username} ({user.email})")
            print(f"ID записи верификации: {verification.id}, истекает: {expires_at}")
            
            # Отправляем email с кодом подтверждения
            subject = "Подтверждение регистрации на Auto Auction"
            
            # Подготавливаем HTML-версию письма используя шаблон для регистрации
            html_message = render_to_string('emails/registration_welcome.html', {
                'username': user.username,
                'verification_code': verification_code
            })
            
            # Проверяем настройки email перед отправкой
            print(f"Отправка письма для регистрации через {settings.EMAIL_HOST} (порт {settings.EMAIL_PORT})")
            print(f"EMAIL_HOST_USER: {settings.EMAIL_HOST_USER if settings.EMAIL_HOST_USER else 'не задан'}")
            print(f"EMAIL_HOST_PASSWORD: {'настроен' if settings.EMAIL_HOST_PASSWORD else 'не задан'}")
            
            try:
                # Используем функцию для отправки HTML-писем
                result = send_html_email(
                    subject,
                    html_message,
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=False
                )
                print(f"Результат отправки: {result}. Код подтверждения успешно отправлен при регистрации на email: {user.email}")
            except Exception as e:
                print(f"Ошибка отправки email верификации при регистрации: {str(e)}")
                if hasattr(e, '__dict__'):
                    for key, value in e.__dict__.items():
                        print(f"    {key}: {value}")
            
            return Response({
                'user': UserSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'email_verification_sent': True
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            print(f"Ошибка в RegisterView: {str(e)}")
            return Response(
                {"error": f"Ошибка при регистрации: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request, *args, **kwargs):
        try:
            serializer = LoginSerializer(data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            user = serializer.validated_data['user']
            
            # Проверяем статус верификации email
            if not user.is_email_verified:
                # Если email не верифицирован, генерируем и отправляем новый код верификации
                verification_code = ''.join(random.choices('0123456789', k=6))
                expires_at = timezone.now() + timedelta(minutes=10)
                
                # Помечаем все предыдущие неиспользованные коды как использованные
                EmailVerificationCode.objects.filter(
                    user=user,
                    is_used=False
                ).update(is_used=True)
                
                # Сохраняем код в базу данных
                verification = EmailVerificationCode.objects.create(
                    user=user,
                    code=verification_code,
                    expires_at=expires_at
                )
                
                print(f"Создан новый код верификации: {verification_code} для пользователя {user.username} ({user.email})")
                print(f"ID записи верификации: {verification.id}, истекает: {expires_at}")
                print(f"Предыдущие коды помечены как использованные")
                
                # Отправляем email с кодом
                subject = "Подтверждение email на Auto Auction"
                
                # Подготавливаем HTML-версию письма используя шаблон
                html_message = render_to_string('emails/email_verification.html', {
                    'username': user.username,
                    'verification_code': verification_code
                })
                
                # Проверяем настройки email перед отправкой
                print(f"Отправка письма через {settings.EMAIL_HOST} (порт {settings.EMAIL_PORT})")
                print(f"EMAIL_HOST_USER: {settings.EMAIL_HOST_USER if settings.EMAIL_HOST_USER else 'не задан'}")
                print(f"EMAIL_HOST_PASSWORD: {'настроен' if settings.EMAIL_HOST_PASSWORD else 'не задан'}")
                
                try:
                    # Используем функцию для отправки HTML-писем
                    result = send_html_email(
                        subject,
                        html_message,
                        settings.DEFAULT_FROM_EMAIL,
                        [user.email],
                        fail_silently=False
                    )
                    print(f"Результат отправки: {result}. Код подтверждения успешно отправлен на email: {user.email}")
                except Exception as e:
                    print(f"Ошибка отправки email верификации: {str(e)}")
                    if hasattr(e, '__dict__'):
                        for key, value in e.__dict__.items():
                            print(f"    {key}: {value}")
                
                # Возвращаем информацию, что требуется верификация email
                return Response({
                    'user': UserSerializer(user).data,
                    'email_verification_required': True,
                    'message': 'Для входа в систему необходимо подтвердить email. Код подтверждения отправлен на ваш email.'
                }, status=status.HTTP_200_OK)
            
            # Если email верифицирован, обычный вход
            # Login user in Django session
            login(request, user)
            
            # Generate tokens
            refresh = RefreshToken.for_user(user)
            
            print(f"Успешный вход пользователя: {user.username} ({user.email})")
            
            return Response({
                'user': UserSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            })
        except Exception as e:
            print(f"Ошибка в LoginView: {str(e)}")
            return Response(
                {"error": f"Ошибка при входе: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        # Blacklist the refresh token
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            
            # Logout from Django session
            logout(request)
            
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user

class PasswordChangeView(generics.GenericAPIView):
    serializer_class = PasswordChangeSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Change password
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        
        return Response({"detail": "Password changed successfully"}, status=status.HTTP_200_OK)

class PasswordResetRequestView(generics.GenericAPIView):
    serializer_class = PasswordResetRequestSerializer
    permission_classes = [permissions.AllowAny]
    
    def post(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            email = serializer.validated_data['email']
            
            try:
                user = User.objects.get(email=email)
                print(f"Запрос на сброс пароля для пользователя {user.username} ({user.email})")
            except User.DoesNotExist:
                # Не сообщаем пользователю, что email не существует (защита от атак)
                print(f"Попытка сброса пароля для несуществующего email: {email}")
                return Response(
                    {"detail": "Если указанный email существует, на него отправлено письмо для сброса пароля."},
                    status=status.HTTP_200_OK
                )
            
            # Generate password reset token
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            
            # Build reset URL (frontend should handle this route)
            reset_url = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}/"
            
            print(f"Создана ссылка для сброса пароля: {reset_url}")
            
            # Send email
            subject = "Восстановление пароля на Auto Auction"
            
            # Подготавливаем HTML-версию письма используя шаблон
            html_message = render_to_string('emails/password_reset.html', {
                'username': user.username,
                'reset_url': reset_url
            })
            
            # Проверяем настройки email перед отправкой
            print(f"Отправка письма для сброса пароля через {settings.EMAIL_HOST} (порт {settings.EMAIL_PORT})")
            print(f"EMAIL_HOST_USER: {settings.EMAIL_HOST_USER if settings.EMAIL_HOST_USER else 'не задан'}")
            print(f"EMAIL_HOST_PASSWORD: {'настроен' if settings.EMAIL_HOST_PASSWORD else 'не задан'}")
            
            try:
                # Используем функцию для отправки HTML-писем
                result = send_html_email(
                    subject,
                    html_message,
                    settings.DEFAULT_FROM_EMAIL,
                    [email],
                    fail_silently=False,
                )
                print(f"Результат отправки: {result}. Письмо для сброса пароля успешно отправлено на email: {email}")
                
                return Response(
                    {"detail": "Инструкции по сбросу пароля отправлены на указанный email."},
                    status=status.HTTP_200_OK
                )
            except Exception as e:
                print(f"Ошибка отправки email для сброса пароля: {str(e)}")
                if hasattr(e, '__dict__'):
                    for key, value in e.__dict__.items():
                        print(f"    {key}: {value}")
                
                return Response(
                    {"error": f"Не удалось отправить email: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        except Exception as e:
            print(f"Ошибка в PasswordResetRequestView: {str(e)}")
            return Response(
                {"error": f"Ошибка при запросе сброса пароля: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class PasswordResetConfirmView(generics.GenericAPIView):
    serializer_class = PasswordResetConfirmSerializer
    permission_classes = [permissions.AllowAny]
    
    def post(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Parse token from frontend
            token_parts = serializer.validated_data['token'].split('/')
            print(f"Получен запрос на подтверждение сброса пароля с токеном: {serializer.validated_data['token']}")
            
            if len(token_parts) != 2:
                print(f"Неверный формат токена: {serializer.validated_data['token']}")
                return Response(
                    {"error": "Неверный формат токена"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            uid = token_parts[0]
            token = token_parts[1]
            
            # Decode user ID
            try:
                user_id = force_str(urlsafe_base64_decode(uid))
                user = User.objects.get(pk=user_id)
                print(f"Найден пользователь: {user.username} ({user.email})")
            except (TypeError, ValueError, OverflowError, User.DoesNotExist) as e:
                print(f"Ошибка при декодировании ID пользователя ({uid}): {str(e)}")
                return Response(
                    {"error": "Неверный или истекший токен"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Verify token
            if not default_token_generator.check_token(user, token):
                print(f"Неверный или истекший токен для пользователя {user.username}")
                return Response(
                    {"error": "Неверный или истекший токен"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            print(f"Токен успешно проверен для пользователя {user.username}")
            
            # Set new password
            user.set_password(serializer.validated_data['password'])
            user.save()
            
            print(f"Пароль успешно сброшен для пользователя {user.username} ({user.email})")
            
            return Response(
                {"detail": "Пароль успешно сброшен."},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            print(f"Ошибка в PasswordResetConfirmView: {str(e)}")
            return Response(
                {"error": f"Не удалось сбросить пароль: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

class SellerProfileView(generics.RetrieveAPIView):
    """Представление для просмотра информации о продавце"""
    serializer_class = SellerProfileSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_object(self):
        user_id = self.kwargs.get('user_id')
        return get_object_or_404(User, id=user_id)
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

@method_decorator(csrf_exempt, name='dispatch')
class UserAvatarView(APIView):
    """API для управления аватаром пользователя"""
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def post(self, request, *args, **kwargs):
        """Загрузка нового аватара пользователя"""
        print(f"Received avatar upload request from: {request.user.username}")
        print(f"Files in request: {request.FILES.keys()}")
        
        # Добавим вывод заголовков для диагностики
        print(f"Request headers: {request.headers}")
        
        if 'avatar' not in request.FILES:
            return Response(
                {"error": "Требуется файл изображения аватара"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        user = request.user
        profile = user.profile
        
        # Удаляем старый аватар, если он есть
        if profile.avatar:
            profile.avatar.delete(save=False)
            
        # Устанавливаем новый аватар
        profile.avatar = request.FILES['avatar']
        profile.save()
        
        # Возвращаем полный URL аватара и профиль пользователя для обновления в UI
        avatar_url = request.build_absolute_uri(profile.avatar.url) if profile.avatar else None
        
        # Возвращаем обновленные данные профиля
        return Response({
            "detail": "Аватар успешно обновлен", 
            "avatar": avatar_url,
            "profile": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "profile": {
                    "bio": profile.bio,
                    "avatar": avatar_url,
                }
            }
        }, status=status.HTTP_200_OK)
        
    def delete(self, request, *args, **kwargs):
        """Удаление аватара пользователя"""
        user = request.user
        profile = user.profile
        
        if profile.avatar:
            profile.avatar.delete(save=False)
            profile.avatar = None
            profile.save()
            
        return Response(
            {"detail": "Аватар успешно удален"},
            status=status.HTTP_200_OK
        )

class EmailVerificationRequestView(generics.GenericAPIView):
    """Эндпоинт для запроса кода подтверждения email"""
    serializer_class = EmailVerificationRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            user = request.user
            email = serializer.validated_data['email']
            
            # Проверяем, что email соответствует пользователю
            if user.email != email:
                return Response(
                    {"error": "Email не соответствует текущему пользователю"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Проверяем, что email еще не подтвержден
            if user.is_email_verified:
                return Response(
                    {"error": "Email уже подтвержден"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Генерируем 6-значный код
            verification_code = ''.join(random.choices('0123456789', k=6))
            
            # Устанавливаем время жизни кода - 10 минут
            expires_at = timezone.now() + timedelta(minutes=10)
            
            # Помечаем все предыдущие неиспользованные коды как использованные
            EmailVerificationCode.objects.filter(
                user=user,
                is_used=False
            ).update(is_used=True)
            
            # Сохраняем код в базу данных
            verification = EmailVerificationCode.objects.create(
                user=user,
                code=verification_code,
                expires_at=expires_at
            )
            
            print(f"Создан новый код верификации (EmailVerificationRequestView): {verification_code} для пользователя {user.username} ({user.email})")
            print(f"ID записи верификации: {verification.id}, истекает: {expires_at}")
            
            # Отправляем email с кодом
            subject = "Подтверждение email на Auto Auction"
            
            # Подготавливаем HTML-версию письма используя шаблон
            html_message = render_to_string('emails/email_verification.html', {
                'username': user.username,
                'verification_code': verification_code
            })
            
            # Проверяем настройки email перед отправкой
            print(f"Отправка письма через {settings.EMAIL_HOST} (порт {settings.EMAIL_PORT})")
            print(f"EMAIL_HOST_USER: {settings.EMAIL_HOST_USER if settings.EMAIL_HOST_USER else 'не задан'}")
            print(f"EMAIL_HOST_PASSWORD: {'настроен' if settings.EMAIL_HOST_PASSWORD else 'не задан'}")
            
            try:
                # Используем функцию для отправки HTML-писем
                result = send_html_email(
                    subject,
                    html_message,
                    settings.DEFAULT_FROM_EMAIL,
                    [email],
                    fail_silently=False
                )
                print(f"Результат отправки: {result}. Код подтверждения успешно отправлен на email: {email}")
                
                return Response(
                    {"detail": "Код подтверждения отправлен на ваш email"},
                    status=status.HTTP_200_OK
                )
            except Exception as e:
                print(f"Ошибка отправки email верификации: {str(e)}")
                if hasattr(e, '__dict__'):
                    for key, value in e.__dict__.items():
                        print(f"    {key}: {value}")
                        
                return Response(
                    {"error": f"Не удалось отправить email: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        except Exception as e:
            print(f"Ошибка в EmailVerificationRequestView: {str(e)}")
            return Response(
                {"error": f"Ошибка при запросе верификации: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class EmailVerificationConfirmView(generics.GenericAPIView):
    """Эндпоинт для подтверждения email с помощью кода (для авторизованных пользователей)"""
    serializer_class = EmailVerificationCodeSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            user = request.user
            code = serializer.validated_data['code']
            
            print(f"Попытка верификации email для пользователя {user.username} ({user.email}) с кодом {code}")
            
            # Получаем последний активный код подтверждения для пользователя
            try:
                verification_code = EmailVerificationCode.objects.filter(
                    user=user,
                    is_used=False,
                    expires_at__gt=timezone.now()
                ).latest('created_at')
                
                print(f"Найден активный код верификации: {verification_code.code}, создан: {verification_code.created_at}")
            except EmailVerificationCode.DoesNotExist:
                all_codes = EmailVerificationCode.objects.filter(user=user).order_by('-created_at')
                if all_codes:
                    latest = all_codes.first()
                    print(f"Последний код: {latest.code}, использован: {latest.is_used}, истёк: {latest.expires_at < timezone.now()}")
                else:
                    print(f"Не найдено ни одного кода верификации для пользователя {user.username}")
                
                return Response(
                    {"error": "Нет активного кода подтверждения или код истек"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Проверяем код
            if verification_code.code != code:
                print(f"Неверный код подтверждения: {code}, ожидался: {verification_code.code}")
                return Response(
                    {"error": "Неверный код подтверждения"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Отмечаем код как использованный
            verification_code.is_used = True
            verification_code.save()
            
            # Отмечаем email как подтвержденный
            user.is_email_verified = True
            user.save()
            
            print(f"Email успешно подтвержден для пользователя {user.username} ({user.email})")
            
            return Response(
                {"detail": "Email успешно подтвержден"},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            print(f"Ошибка в EmailVerificationConfirmView: {str(e)}")
            return Response(
                {"error": f"Ошибка при подтверждении email: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
class LoginVerificationView(generics.GenericAPIView):
    """Эндпоинт для подтверждения email при входе (без JWT токена)"""
    serializer_class = EmailVerificationCodeSerializer
    permission_classes = [permissions.AllowAny]
    
    def post(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            email = request.data.get('email')
            code = serializer.validated_data['code']
            
            if not email:
                return Response(
                    {"error": "Email обязателен"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                print(f"Пользователь с email {email} не найден")
                return Response(
                    {"error": "Пользователь с таким email не найден"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Получаем последний активный код подтверждения для пользователя
            try:
                verification_code = EmailVerificationCode.objects.filter(
                    user=user,
                    is_used=False,
                    expires_at__gt=timezone.now()
                ).latest('created_at')
                
                print(f"Найден код верификации: {verification_code.code}, ожидается: {code}")
            except EmailVerificationCode.DoesNotExist:
                all_codes = EmailVerificationCode.objects.filter(user=user).order_by('-created_at')
                if all_codes:
                    latest = all_codes.first()
                    print(f"Последний код: {latest.code}, использован: {latest.is_used}, истёк: {latest.expires_at < timezone.now()}")
                else:
                    print(f"Не найдено ни одного кода верификации для пользователя {user.username}")
                
                return Response(
                    {"error": "Нет активного кода подтверждения или код истек"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Проверяем код
            if verification_code.code != code:
                print(f"Неверный код подтверждения: {code}, ожидался: {verification_code.code}")
                return Response(
                    {"error": "Неверный код подтверждения"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Отмечаем код как использованный
            verification_code.is_used = True
            verification_code.save()
            
            # Отмечаем email как подтвержденный
            user.is_email_verified = True
            user.save()
            
            # Авторизуем пользователя и создаем токены
            login(request, user)
            refresh = RefreshToken.for_user(user)
            
            print(f"Успешная верификация для пользователя {user.username} ({user.email})")
            
            return Response({
                "detail": "Email успешно подтвержден",
                "user": UserSerializer(user).data,
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            }, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Ошибка в LoginVerificationView: {str(e)}")
            return Response(
                {"error": f"Ошибка при верификации: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class SellerReviewViewSet(viewsets.ModelViewSet):
    """API для работы с отзывами о продавцах"""
    serializer_class = SellerReviewSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return SellerReview.objects.filter(seller_id=self.kwargs.get('seller_id'))
    
    def perform_create(self, serializer):
        seller_id = self.kwargs.get('seller_id')
        seller = get_object_or_404(User, id=seller_id)
        
        # Проверяем, что пользователь не оставляет отзыв самому себе
        if self.request.user.id == seller.id:
            raise rest_serializers.ValidationError({"detail": "Вы не можете оставить отзыв самому себе."})
            
        # Проверяем, не оставлял ли пользователь уже отзыв этому продавцу
        if SellerReview.objects.filter(seller=seller, reviewer=self.request.user).exists():
            raise rest_serializers.ValidationError({"detail": "Вы уже оставили отзыв этому продавцу."})
            
        serializer.save(seller=seller, reviewer=self.request.user)
        
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Проверяем, что текущий пользователь является автором отзыва
        if instance.reviewer != request.user:
            return Response(
                {"detail": "У вас нет разрешения редактировать этот отзыв."},
                status=status.HTTP_403_FORBIDDEN
            )
            
        return super().update(request, *args, **kwargs)
        
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Проверяем, что текущий пользователь является автором отзыва
        if instance.reviewer != request.user:
            return Response(
                {"detail": "У вас нет разрешения удалять этот отзыв."},
                status=status.HTTP_403_FORBIDDEN
            )
            
        return super().destroy(request, *args, **kwargs)
