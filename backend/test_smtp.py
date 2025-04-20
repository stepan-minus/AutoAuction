import os
import smtplib
from dotenv import load_dotenv

# Загрузка переменных окружения из файла .env
load_dotenv('.env')

# Получение учетных данных из переменных окружения
email_host = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
email_port = int(os.getenv('EMAIL_PORT', '587'))
email_host_user = os.getenv('EMAIL_HOST_USER', '')
email_host_password = os.getenv('EMAIL_HOST_PASSWORD', '')

print(f"SMTP настройки:")
print(f"Хост: {email_host}")
print(f"Порт: {email_port}")
print(f"Пользователь: {email_host_user}")
print(f"Пароль: {'Установлен' if email_host_password else 'Не установлен'}")

try:
    # Подключение к серверу SMTP
    print("\nПодключение к SMTP серверу...")
    server = smtplib.SMTP(email_host, email_port)
    server.ehlo()
    
    # Включение TLS
    print("Включение TLS...")
    server.starttls()
    server.ehlo()
    
    # Авторизация
    print("Авторизация...")
    server.login(email_host_user, email_host_password)
    print("Авторизация успешна!")
    
    # Закрытие соединения
    server.quit()
    print("Соединение закрыто. SMTP настроен правильно!")
except Exception as e:
    print(f"Ошибка: {str(e)}")