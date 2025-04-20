import os
import sys
from django.core.wsgi import get_wsgi_application

# Добавляем директорию проекта в sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

# Устанавливаем переменную окружения для настройки Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Инициализируем Django
application = get_wsgi_application()

# Импортируем необходимые модули
from django.template.loader import render_to_string
from django.core.mail import EmailMultiAlternatives
from django.utils.html import strip_tags
from django.conf import settings
from django.contrib.auth import get_user_model

User = get_user_model()

def test_email_templates():
    """
    Тестирует HTML-шаблоны для электронной почты
    """
    print("=== Тестирование отправки email с HTML-шаблоном ===")
    
    try:
        # Используем действующего пользователя или создаем тестового
        user = User.objects.filter(is_staff=True).first()
        if not user:
            user = User.objects.first()
        
        if user:
            print(f"Используем пользователя: {user.username} ({user.email})")
        else:
            print("Пользователи не найдены. Используем тестовые данные.")
            # Создаем объект с необходимыми атрибутами для шаблона
            class TestUser:
                def __init__(self):
                    self.username = "TestUser"
                    self.email = settings.EMAIL_HOST_USER
            user = TestUser()
        
        # Тестирование шаблона подтверждения email
        verification_url = f"{settings.FRONTEND_URL}/verify-email?token=test_token_12345"
        test_verification_email(user, verification_url)
        
        # Тестирование шаблона сброса пароля
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token=test_token_password_12345"
        test_password_reset_email(user, reset_url)
        
    except Exception as e:
        print(f"❌ Ошибка при тестировании шаблонов email: {str(e)}")

def test_verification_email(user, verification_url):
    """
    Тестирует шаблон письма для подтверждения электронной почты
    """
    try:
        # Подготовка данных для шаблона
        subject = "Подтверждение email"
        template_name = "email/verification_email.html"
        context = {
            "user": user,
            "verification_url": verification_url
        }
        
        # Рендеринг HTML-шаблона
        html_content = render_to_string(template_name, context)
        text_content = strip_tags(html_content)  # Текстовая версия без HTML
        
        # Создание сообщения
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email]
        )
        msg.attach_alternative(html_content, "text/html")
        
        # Отправка
        msg.send()
        print(f"✅ Шаблон подтверждения email успешно отправлен на {user.email}")
        
    except Exception as e:
        print(f"❌ Ошибка при отправке шаблона подтверждения email: {str(e)}")

def test_password_reset_email(user, reset_url):
    """
    Тестирует шаблон письма для сброса пароля
    """
    try:
        # Подготовка данных для шаблона
        subject = "Сброс пароля"
        template_name = "email/password_reset_email.html"
        context = {
            "user": user,
            "reset_url": reset_url
        }
        
        # Рендеринг HTML-шаблона
        html_content = render_to_string(template_name, context)
        text_content = strip_tags(html_content)  # Текстовая версия без HTML
        
        # Создание сообщения
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email]
        )
        msg.attach_alternative(html_content, "text/html")
        
        # Отправка
        msg.send()
        print(f"✅ Шаблон сброса пароля успешно отправлен на {user.email}")
        
    except Exception as e:
        print(f"❌ Ошибка при отправке шаблона сброса пароля: {str(e)}")

if __name__ == "__main__":
    test_email_templates()