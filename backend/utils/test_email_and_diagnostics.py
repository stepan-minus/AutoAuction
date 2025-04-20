#!/usr/bin/env python
"""
Скрипт для тестирования отправки электронной почты и диагностики проблем
"""
import os
import sys
import logging
import traceback
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.header import Header

# Настраиваем логирование
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Добавляем родительскую директорию в sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Инициализируем Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django
django.setup()

from django.conf import settings
from utils.email_config import sanitize_password
from utils.email_service import EmailService

def print_header(title):
    """Печатает заголовок секции"""
    print("\n" + "=" * 80)
    print(title.center(80))
    print("=" * 80 + "\n")

def print_config():
    """Печатает текущую конфигурацию email"""
    print(f"EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
    print(f"EMAIL_HOST: {settings.EMAIL_HOST}")
    print(f"EMAIL_PORT: {settings.EMAIL_PORT}")
    print(f"EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
    print(f"EMAIL_USE_SSL: {settings.EMAIL_USE_SSL}")
    print(f"DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
    print(f"EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
    print(f"EMAIL_HOST_PASSWORD: {'настроен' if settings.EMAIL_HOST_PASSWORD else 'не настроен'}")

def test_connection():
    """Тестирует соединение с SMTP сервером"""
    print_header("ПРОВЕРКА СОЕДИНЕНИЯ С SMTP СЕРВЕРОМ")
    
    try:
        # Проверяем корректность параметров
        if not settings.EMAIL_HOST:
            print("❌ EMAIL_HOST не указан.")
            return False
        
        if not settings.EMAIL_PORT:
            print("❌ EMAIL_PORT не указан.")
            return False
        
        # Печатаем используемую конфигурацию
        print_config()
        
        # Проверяем соединение
        print(f"\nПодключаемся к серверу {settings.EMAIL_HOST}:{settings.EMAIL_PORT}...")
        
        smtp = None
        if settings.EMAIL_USE_SSL:
            print("Используем SSL соединение")
            smtp = smtplib.SMTP_SSL(settings.EMAIL_HOST, settings.EMAIL_PORT)
        else:
            print("Используем обычное соединение")
            smtp = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT)
            
        # Запрашиваем расширенную информацию о сервере
        server_info = smtp.ehlo()
        print(f"Информация о сервере: {server_info}")
        
        # Если используем TLS, включаем его
        if settings.EMAIL_USE_TLS:
            print("Включаем TLS...")
            smtp.starttls()
            # После включения TLS нужно снова выполнить EHLO
            server_info = smtp.ehlo()
            print(f"Информация о сервере (после TLS): {server_info}")
        
        # Если указаны учетные данные, пробуем авторизоваться
        if settings.EMAIL_HOST_USER and settings.EMAIL_HOST_PASSWORD:
            print(f"Авторизуемся как {settings.EMAIL_HOST_USER}...")
            
            # Очищаем пароль от Unicode символов
            clean_password = sanitize_password(settings.EMAIL_HOST_PASSWORD)
            
            # Авторизуемся на сервере
            smtp.login(settings.EMAIL_HOST_USER, clean_password)
            print("✅ Авторизация успешна!")
        else:
            print("⚠️ EMAIL_HOST_USER или EMAIL_HOST_PASSWORD не указаны, пропускаем авторизацию.")
        
        # Закрываем соединение
        smtp.quit()
        print("✅ Соединение с SMTP сервером успешно установлено и закрыто.")
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        print(f"❌ Ошибка авторизации: {e}")
        print("\nВозможные причины:")
        print("1. Неверный логин или пароль")
        print("2. Для аккаунта с 2FA требуется использовать пароль приложения")
        print("3. Включена блокировка небезопасных приложений")
        print("\nЕсли вы используете Gmail, запустите скрипт:")
        print("python utils/google_mail_helper.py")
        return False
        
    except Exception as e:
        print(f"❌ Ошибка при проверке соединения: {e}")
        traceback.print_exc()
        return False

def send_test_email(recipient=None):
    """Отправляет тестовое письмо"""
    print_header("ОТПРАВКА ТЕСТОВОГО ПИСЬМА")
    
    if not recipient:
        if settings.EMAIL_HOST_USER:
            recipient = settings.EMAIL_HOST_USER
            print(f"Получатель не указан, используем EMAIL_HOST_USER: {recipient}")
        else:
            recipient = input("Введите адрес получателя: ")
    
    # Проверяем связь перед отправкой
    if not test_connection():
        print("❌ Не удалось установить соединение с SMTP сервером. Отправка письма не выполнена.")
        return False
    
    try:
        # Создаем сообщение
        msg = MIMEMultipart()
        msg['Subject'] = Header('Тестовое письмо', 'utf-8')
        msg['From'] = Header(settings.DEFAULT_FROM_EMAIL, 'utf-8')
        msg['To'] = Header(recipient, 'utf-8')
        
        # Текст письма
        text = """
        Это тестовое письмо, отправленное из приложения АвтоАукцион.
        
        Если вы видите это письмо, значит настройка email работает корректно.
        
        С уважением,
        Команда АвтоАукцион
        """
        
        # HTML версия
        html = """
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { text-align: center; padding: 20px 0; }
                .content { padding: 20px 0; }
                .footer { text-align: center; padding: 20px 0; font-size: 12px; color: #777; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>АвтоАукцион</h1>
                </div>
                <div class="content">
                    <h2>Тестовое письмо</h2>
                    <p>Это тестовое письмо, отправленное из приложения АвтоАукцион.</p>
                    <p><strong>Если вы видите это письмо, значит настройка email работает корректно.</strong></p>
                </div>
                <div class="footer">
                    <p>С уважением,<br>Команда АвтоАукцион</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Прикрепляем текстовую версию
        part1 = MIMEText(text, 'plain', 'utf-8')
        msg.attach(part1)
        
        # Прикрепляем HTML версию
        part2 = MIMEText(html, 'html', 'utf-8')
        msg.attach(part2)
        
        # Отправляем письмо
        print(f"\nОтправляем тестовое письмо на {recipient}...")
        
        smtp = None
        try:
            if settings.EMAIL_USE_SSL:
                smtp = smtplib.SMTP_SSL(settings.EMAIL_HOST, settings.EMAIL_PORT)
            else:
                smtp = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT)
                if settings.EMAIL_USE_TLS:
                    smtp.starttls()
            
            # Очищаем пароль от Unicode символов
            clean_password = sanitize_password(settings.EMAIL_HOST_PASSWORD)
            
            # Авторизуемся на сервере
            smtp.login(settings.EMAIL_HOST_USER, clean_password)
            
            # Отправляем письмо
            smtp.sendmail(settings.DEFAULT_FROM_EMAIL, [recipient], msg.as_string())
            
            # Закрываем соединение
            smtp.quit()
            
            print(f"✅ Тестовое письмо успешно отправлено на {recipient}")
            return True
            
        except Exception as e:
            if smtp:
                smtp.quit()
            raise e
    
    except Exception as e:
        print(f"❌ Ошибка при отправке письма: {e}")
        traceback.print_exc()
        return False

def test_with_debug():
    """Запускает расширенную диагностику из EmailService"""
    print_header("РАСШИРЕННАЯ ДИАГНОСТИКА")
    
    # Запускаем диагностику соединения
    smtp_debug = EmailService.debug_smtp_connection()
    
    # Выводим результаты
    if smtp_debug['success']:
        print("✅ SMTP соединение успешно установлено")
    else:
        print(f"❌ Ошибка SMTP соединения: {smtp_debug.get('message', 'Неизвестная ошибка')}")
    
    # Выводим подробности диагностики
    print("\nРезультаты диагностики:")
    print(smtp_debug['details'])
    
    return smtp_debug['success']

def main():
    """Главная функция"""
    print_header("ДИАГНОСТИКА И ТЕСТИРОВАНИЕ EMAIL")
    print("Этот скрипт поможет проверить настройки электронной почты и отправить тестовое письмо.")
    
    while True:
        print("\nВыберите действие:")
        print("1. Проверить соединение с SMTP сервером")
        print("2. Отправить тестовое письмо")
        print("3. Запустить расширенную диагностику")
        print("4. Настройка Gmail (для пользователей Gmail)")
        print("0. Выход")
        
        choice = input("\nВаш выбор: ")
        
        if choice == "1":
            test_connection()
        elif choice == "2":
            recipient = input("Введите email получателя (или нажмите Enter, чтобы использовать EMAIL_HOST_USER): ")
            if not recipient:
                recipient = None
            send_test_email(recipient)
        elif choice == "3":
            test_with_debug()
        elif choice == "4":
            from utils.google_mail_helper import show_gmail_2fa_instructions
            show_gmail_2fa_instructions()
        elif choice == "0":
            print("Выход из программы.")
            break
        else:
            print("Неверный выбор. Попробуйте еще раз.")
        
        input("\nНажмите Enter для продолжения...")

if __name__ == "__main__":
    # Проверяем аргументы командной строки для запуска без интерактивного режима
    if len(sys.argv) > 1:
        if sys.argv[1] == "connection":
            test_connection()
        elif sys.argv[1] == "send":
            recipient = sys.argv[2] if len(sys.argv) > 2 else None
            send_test_email(recipient)
        elif sys.argv[1] == "debug":
            test_with_debug()
        elif sys.argv[1] == "gmail":
            from utils.google_mail_helper import show_gmail_2fa_instructions
            show_gmail_2fa_instructions()
        else:
            print(f"Неизвестный аргумент: {sys.argv[1]}")
            print("Доступные аргументы: connection, send [email], debug, gmail")
    else:
        # Интерактивный режим
        main()