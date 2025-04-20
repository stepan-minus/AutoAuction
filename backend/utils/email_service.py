import os
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.header import Header
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from utils.email_config import sanitize_password  # Импортируем функцию из модуля email_config

logger = logging.getLogger(__name__)

class EmailService:
    """
    Сервис для отправки электронных писем
    """
    
    @staticmethod
    def send_email(subject, template_name, recipient_list, context, from_email=None):
        """
        Отправляет электронное письмо с HTML-шаблоном
        
        Args:
            subject (str): Тема письма
            template_name (str): Путь к HTML-шаблону
            recipient_list (list): Список получателей
            context (dict): Контекст для рендеринга шаблона
            from_email (str, optional): Email отправителя
        
        Returns:
            bool: True если письмо успешно отправлено, иначе False
        """
        try:
            # Устанавливаем отправителя
            sender = from_email or settings.DEFAULT_FROM_EMAIL
            
            # Рендерим HTML-шаблон
            html_content = render_to_string(template_name, context)
            
            # Создаем текстовую версию из HTML
            text_content = strip_tags(html_content)
            
            # Создаем сообщение напрямую через smtplib
            msg = MIMEMultipart('alternative')
            # Используем Header для корректной кодировки темы письма
            msg['Subject'] = Header(subject, 'utf-8')
            msg['From'] = Header(sender, 'utf-8')
            msg['To'] = Header(', '.join(recipient_list), 'utf-8')
            
            # Добавляем текстовую и HTML версии
            part1 = MIMEText(text_content, 'plain', 'utf-8')
            part2 = MIMEText(html_content, 'html', 'utf-8')
            
            msg.attach(part1)
            msg.attach(part2)
            
            # Отправка через SMTP напрямую
            try:
                print(f"===== ОТПРАВКА EMAIL =====")
                print(f"Subject: {subject}")
                print(f"From: {sender}")
                print(f"To: {recipient_list}")
                print(f"EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
                print(f"EMAIL_HOST: {settings.EMAIL_HOST}")
                print(f"EMAIL_PORT: {settings.EMAIL_PORT}")
                print(f"EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
                print(f"EMAIL_USE_SSL: {settings.EMAIL_USE_SSL}")
                print(f"DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
                print(f"EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
                print(f"EMAIL_HOST_PASSWORD: {'настроен' if settings.EMAIL_HOST_PASSWORD else 'не настроен'}")
                
                # Подключаемся к SMTP серверу
                print(f"Проверка подключения к SMTP серверу {settings.EMAIL_HOST}...")
                
                smtp = None
                if settings.EMAIL_USE_SSL:
                    smtp = smtplib.SMTP_SSL(settings.EMAIL_HOST, settings.EMAIL_PORT)
                else:
                    smtp = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT)
                    if settings.EMAIL_USE_TLS:
                        smtp.starttls()
                
                # Очищаем пароль от Unicode-символов, которые могут вызвать проблемы
                clean_password = sanitize_password(settings.EMAIL_HOST_PASSWORD)
                
                smtp.login(settings.EMAIL_HOST_USER, clean_password)
                smtp.sendmail(sender, recipient_list, msg.as_string())
                smtp.quit()
                
                logger.info(f"Email успешно отправлен на адреса: {', '.join(recipient_list)}")
                return True
                
            except smtplib.SMTPAuthenticationError:
                print(f"Ошибка подключения к SMTP серверу {settings.EMAIL_HOST}: Ошибка аутентификации")
                print("Возможные причины:")
                print("1. Неверный логин или пароль")
                print("2. Для аккаунта с 2FA требуется использовать пароль приложения")
                print("3. Включена блокировка небезопасных приложений")
                print("Подробнее: https://support.google.com/mail/?p=BadCredentials")
                logger.error(f"Ошибка аутентификации SMTP: {settings.EMAIL_HOST_USER}")
                return False
                
            except Exception as e:
                print(f"Ошибка подключения к SMTP серверу {settings.EMAIL_HOST}: {str(e)}")
                print("Возможные причины:")
                print("1. Неверный логин или пароль")
                print("2. Для аккаунта с 2FA требуется использовать пароль приложения")
                print("3. Включена блокировка небезопасных приложений")
                print("Подробнее: https://support.google.com/mail/?p=BadCredentials")
                logger.error(f"Ошибка отправки email через SMTP: {str(e)}")
                return False
            
        except Exception as e:
            print(f"ОШИБКА при отправке email: {str(e)}")
            print("===== ОШИБКА ОТПРАВКИ =====")
            logger.error(f"Ошибка при отправке email: {str(e)}")
            return False
    
    @classmethod
    def send_verification_email(cls, user, verification_url):
        """
        Отправляет письмо для подтверждения адреса электронной почты
        
        Args:
            user: Объект пользователя
            verification_url (str): URL для подтверждения
        
        Returns:
            bool: True если письмо успешно отправлено, иначе False
        """
        subject = "Email Verification - Auto Auction"
        template_name = "email/verification_email.html"
        recipient_list = [user.email]
        context = {
            "user": user,
            "verification_url": verification_url
        }
        
        return cls.send_email(subject, template_name, recipient_list, context)
    
    @classmethod
    def send_password_reset_email(cls, user, reset_url):
        """
        Отправляет письмо для сброса пароля
        
        Args:
            user: Объект пользователя
            reset_url (str): URL для сброса пароля
        
        Returns:
            bool: True если письмо успешно отправлено, иначе False
        """
        subject = "Password Reset - Auto Auction"
        template_name = "email/password_reset_email.html"
        recipient_list = [user.email]
        context = {
            "user": user,
            "reset_url": reset_url
        }
        
        return cls.send_email(subject, template_name, recipient_list, context)
    
    @staticmethod
    def analyze_string_encoding(s, name="строка"):
        """
        Анализирует строку на наличие non-ASCII символов и выводит диагностику
        
        Args:
            s (str): Строка для анализа
            name (str): Название строки для вывода
            
        Returns:
            str: Информация о строке и найденных проблемных символах
        """
        if not s:
            return f"{name}: пустая строка"
            
        result = []
        result.append(f"Анализ строки '{name}':")
        result.append(f"Длина: {len(s)} символов")
        
        non_ascii_chars = []
        problem_indices = []
        
        for i, char in enumerate(s):
            if ord(char) > 127:  # Non-ASCII символ
                non_ascii_chars.append((i, char, ord(char), f"\\u{ord(char):04x}"))
                problem_indices.append(i)
                
        if non_ascii_chars:
            result.append(f"Найдены символы не из ASCII (всего {len(non_ascii_chars)}):")
            for i, char, code, hex_repr in non_ascii_chars:
                result.append(f"  Позиция {i}: '{char}' (код: {code}, hex: {hex_repr})")
            
            # Отображаем контекст вокруг проблемных символов
            if problem_indices:
                result.append("Контекст проблемных символов:")
                for idx in problem_indices:
                    start_idx = max(0, idx - 10)
                    end_idx = min(len(s), idx + 10)
                    context = s[start_idx:end_idx]
                    highlight_pos = idx - start_idx
                    result.append(f"  ...{context}...")
                    result.append(f"  {' ' * (highlight_pos + 3)}^")
        else:
            result.append("Символы не из ASCII не найдены.")
            
        return "\n".join(result)

    @classmethod
    def debug_smtp_connection(cls):
        """
        Отладочная функция для проверки подключения к SMTP серверу
        с дополнительной диагностикой параметров
        
        Returns:
            dict: Словарь с результатом диагностики и дополнительной информацией
        """
        result = []
        result.append("===== ДИАГНОСТИКА SMTP ПОДКЛЮЧЕНИЯ =====")
        result.append(f"EMAIL_HOST: {settings.EMAIL_HOST}")
        result.append(f"EMAIL_PORT: {settings.EMAIL_PORT}")
        result.append(f"EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
        result.append(f"EMAIL_USE_SSL: {settings.EMAIL_USE_SSL}")
        result.append(f"EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
        
        # Анализируем логин на наличие non-ASCII символов
        result.append(cls.analyze_string_encoding(settings.EMAIL_HOST_USER, "EMAIL_HOST_USER"))
        
        # Анализируем пароль на наличие non-ASCII символов
        original_password = settings.EMAIL_HOST_PASSWORD
        result.append(cls.analyze_string_encoding(original_password, "EMAIL_HOST_PASSWORD"))
        
        # Проверяем очищенный пароль
        clean_password = sanitize_password(original_password)
        result.append(f"Оригинальный и очищенный пароли идентичны: {original_password == clean_password}")
        
        if original_password != clean_password:
            result.append("Очищенный пароль отличается от оригинального")
            result.append(cls.analyze_string_encoding(clean_password, "CLEAN_PASSWORD"))
        
        # Пробуем подключиться к серверу
        try:
            result.append("Подключение к SMTP серверу...")
            
            # Создаем соединение
            smtp = None
            if settings.EMAIL_USE_SSL:
                result.append(f"Используем SSL соединение на порту {settings.EMAIL_PORT}")
                smtp = smtplib.SMTP_SSL(settings.EMAIL_HOST, settings.EMAIL_PORT)
            else:
                result.append(f"Используем обычное соединение на порту {settings.EMAIL_PORT}")
                smtp = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT)
                if settings.EMAIL_USE_TLS:
                    result.append("Включаем TLS...")
                    smtp.starttls()
            
            # Проверяем статус соединения
            status_code, status_message = smtp.ehlo()
            result.append(f"EHLO статус: {status_code}, {status_message}")
            
            # Логинимся
            result.append(f"Авторизация пользователя {settings.EMAIL_HOST_USER}...")
            smtp.login(settings.EMAIL_HOST_USER, clean_password)
            result.append("✅ Авторизация успешна!")
            
            # Закрываем соединение
            smtp.quit()
            result.append("Соединение закрыто.")
            
            return {
                'success': True, 
                'message': 'SMTP соединение успешно',
                'details': '\n'.join(result)
            }
            
        except smtplib.SMTPAuthenticationError as e:
            error_msg = f"❌ Ошибка авторизации: {str(e)}"
            result.append(error_msg)
            result.append("Возможные причины:")
            result.append("1. Неверный логин или пароль")
            result.append("2. Для аккаунта с 2FA требуется использовать пароль приложения")
            result.append("3. Включена блокировка небезопасных приложений")
            
            return {
                'success': False, 
                'message': 'Ошибка авторизации SMTP',
                'details': '\n'.join(result),
                'error': str(e)
            }
            
        except Exception as e:
            error_msg = f"❌ Ошибка подключения: {str(e)}"
            result.append(error_msg)
            
            return {
                'success': False, 
                'message': 'Ошибка подключения к SMTP серверу',
                'details': '\n'.join(result),
                'error': str(e)
            }

    @classmethod
    def test_email_configuration(cls):
        """
        Тестирует конфигурацию email, отправляя тестовое письмо
        
        Returns:
            dict: Словарь с результатом тестирования {'success': bool, 'message': str}
        """
        try:
            # Проверяем наличие необходимых настроек
            if not settings.EMAIL_HOST_USER or not settings.EMAIL_HOST_PASSWORD:
                return {
                    'success': False,
                    'message': 'Отсутствуют EMAIL_HOST_USER или EMAIL_HOST_PASSWORD'
                }
            
            # Запускаем расширенную диагностику
            smtp_debug = cls.debug_smtp_connection()
            
            # Если с SMTP соединением проблемы, не пытаемся отправить письмо
            if not smtp_debug['success']:
                print(smtp_debug['details'])
                return {
                    'success': False,
                    'message': smtp_debug['message'],
                    'details': smtp_debug['details']
                }
            
            # Отправляем тестовое письмо самому себе
            subject = "Test Email Configuration"
            message = "This is a test message to verify email configuration."
            from_email = settings.DEFAULT_FROM_EMAIL
            recipient_list = [settings.EMAIL_HOST_USER]
            
            # Создаем сообщение напрямую через smtplib
            msg = MIMEMultipart('alternative')
            # Используем Header для корректной кодировки темы письма
            msg['Subject'] = Header(subject, 'utf-8')
            msg['From'] = Header(from_email, 'utf-8')
            msg['To'] = Header(settings.EMAIL_HOST_USER, 'utf-8')
            
            # Добавляем текстовую версию
            part = MIMEText(message, 'plain', 'utf-8')
            msg.attach(part)
            
            # Отправка через SMTP напрямую
            try:
                print(f"===== ТЕСТИРОВАНИЕ EMAIL КОНФИГУРАЦИИ =====")
                print(f"Subject: {subject}")
                print(f"From: {from_email}")
                print(f"To: {settings.EMAIL_HOST_USER}")
                
                # Подключаемся к SMTP серверу
                smtp = None
                if settings.EMAIL_USE_SSL:
                    smtp = smtplib.SMTP_SSL(settings.EMAIL_HOST, settings.EMAIL_PORT)
                else:
                    smtp = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT)
                    if settings.EMAIL_USE_TLS:
                        smtp.starttls()
                
                # Очищаем пароль от Unicode-символов, которые могут вызвать проблемы
                clean_password = sanitize_password(settings.EMAIL_HOST_PASSWORD)
                
                smtp.login(settings.EMAIL_HOST_USER, clean_password)
                smtp.sendmail(from_email, [settings.EMAIL_HOST_USER], msg.as_string())
                smtp.quit()
                
                print(f"✅ Тестовое письмо успешно отправлено на {settings.EMAIL_HOST_USER}")
                return {
                    'success': True,
                    'message': f'Тестовое письмо успешно отправлено на {settings.EMAIL_HOST_USER}'
                }
                
            except smtplib.SMTPAuthenticationError:
                error_msg = f"Ошибка аутентификации SMTP: {settings.EMAIL_HOST_USER}"
                print(f"❌ {error_msg}")
                return {
                    'success': False,
                    'message': error_msg
                }
                
            except Exception as e:
                error_msg = f"Ошибка отправки email через SMTP: {str(e)}"
                print(f"❌ {error_msg}")
                return {
                    'success': False,
                    'message': error_msg
                }
            
        except Exception as e:
            error_msg = f'Ошибка при тестировании email: {str(e)}'
            print(f"❌ {error_msg}")
            return {
                'success': False,
                'message': error_msg
            }