import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.header import Header

def send_test_email():
    # Загружаем переменные окружения
    email_host = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
    email_port = int(os.environ.get('EMAIL_PORT', 587))
    email_host_user = os.environ.get('EMAIL_HOST_USER', 'carauction228@gmail.com')
    email_host_password = os.environ.get('EMAIL_HOST_PASSWORD', '')
    
    # Проверяем наличие учетных данных
    if not email_host_user or not email_host_password:
        print("Ошибка: EMAIL_HOST_USER или EMAIL_HOST_PASSWORD не настроены")
        return False
    
    try:
        # Создаем сообщение
        msg = MIMEMultipart('alternative')
        
        # ASCII-only заголовки для тестирования
        msg['Subject'] = Header('Test Email Plain ASCII', 'ascii')
        msg['From'] = Header(email_host_user, 'ascii')
        msg['To'] = Header(email_host_user, 'ascii')
        
        # ASCII-only текст для тестирования
        text = "This is a test email with ASCII characters only."
        part = MIMEText(text, 'plain', 'ascii')
        msg.attach(part)
        
        print(f"===== ТЕСТИРОВАНИЕ ПРЯМОЙ ОТПРАВКИ EMAIL =====")
        print(f"Subject: Test Email Plain ASCII")
        print(f"From: {email_host_user}")
        print(f"To: {email_host_user}")
        print(f"SMTP сервер: {email_host}")
        print(f"SMTP порт: {email_port}")
        
        # Подключаемся к SMTP серверу
        smtp = smtplib.SMTP(email_host, email_port)
        smtp.ehlo()
        smtp.starttls()
        smtp.ehlo()
        
        # Аутентификация и отправка
        smtp.login(email_host_user, email_host_password)
        smtp.sendmail(email_host_user, [email_host_user], msg.as_string())
        smtp.quit()
        
        print(f"✅ Тестовое письмо успешно отправлено на {email_host_user}")
        return True
        
    except Exception as e:
        print(f"❌ Ошибка при отправке email: {str(e)}")
        return False

if __name__ == "__main__":
    send_test_email()