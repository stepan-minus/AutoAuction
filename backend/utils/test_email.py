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
from django.core.mail import send_mail
from django.conf import settings

def test_email_sending():
    """
    Тестирует отправку электронной почты
    """
    print("=== Тестирование отправки email ===")
    
    try:
        # Используем простую отправку письма для тестирования
        subject = "Test email from Auto Auction"
        message = "This is a test message to verify email service functionality."
        from_email = settings.DEFAULT_FROM_EMAIL
        recipient_list = [settings.EMAIL_HOST_USER]
        
        # Отправляем простое сообщение без использования HTML-шаблона
        success = send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=recipient_list,
            fail_silently=False
        )
        
        if success:
            print(f"✅ Тестовое письмо успешно отправлено на {settings.EMAIL_HOST_USER}")
        else:
            print(f"❌ Не удалось отправить тестовое письмо")
            
    except Exception as e:
        print(f"❌ Ошибка при отправке тестового email: {str(e)}")
    
    print("\nТекущие настройки email:")
    print(f"EMAIL_HOST: {settings.EMAIL_HOST}")
    print(f"EMAIL_PORT: {settings.EMAIL_PORT}")
    print(f"EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
    print(f"EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
    print(f"EMAIL_USE_SSL: {settings.EMAIL_USE_SSL}")
    print(f"DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")

if __name__ == "__main__":
    test_email_sending()