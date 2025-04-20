import os
import re
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

def sanitize_password(password):
    """
    Очищает пароль от Unicode-символов, которые могут вызвать проблемы с кодировкой.
    Заменяет проблемные символы на их ASCII-эквиваленты.
    
    Args:
        password (str): Исходный пароль
        
    Returns:
        str: Очищенный пароль
    """
    if not password:
        return password
        
    # Словарь замен для известных проблемных символов
    replacements = {
        '\u2014': '-',  # Символ em dash (—) заменяем на обычный дефис
        '\u2013': '-',  # Символ en dash (–) заменяем на обычный дефис
        '\u2018': "'",  # Одинарная открывающая кавычка заменяем на обычный апостроф
        '\u2019': "'",  # Одинарная закрывающая кавычка заменяем на обычный апостроф
        '\u201C': '"',  # Двойная открывающая кавычка заменяем на обычную
        '\u201D': '"',  # Двойная закрывающая кавычка заменяем на обычную
    }
    
    # Замена известных символов
    clean_password = ""
    for char in password:
        if ord(char) > 127:  # Заменяем non-ASCII символы
            replacement = replacements.get(char, '_')  # Используем замену из словаря или подчеркивание
            clean_password += replacement
        else:
            clean_password += char
            
    return clean_password

def get_email_domain(email):
    """
    Извлекает домен из адреса электронной почты
    
    Args:
        email (str): Адрес электронной почты
    
    Returns:
        str: Домен почты или None, если формат неверный
    """
    if not email:
        return None
    
    match = re.search(r'@([^@]+)$', email)
    if match:
        return match.group(1).lower()
    return None

def get_smtp_settings(domain):
    """
    Возвращает настройки SMTP для известных почтовых доменов
    
    Args:
        domain (str): Домен почты
    
    Returns:
        dict: Словарь с настройками SMTP или None, если домен неизвестен
    """
    # Стандартные настройки для популярных почтовых сервисов
    smtp_settings = {
        'gmail.com': {
            'host': 'smtp.gmail.com',
            'port': 587,
            'use_tls': True,
            'use_ssl': False
        },
        'googlemail.com': {
            'host': 'smtp.gmail.com',
            'port': 587,
            'use_tls': True,
            'use_ssl': False
        },
        'yandex.ru': {
            'host': 'smtp.yandex.ru',
            'port': 587,
            'use_tls': True,
            'use_ssl': False
        },
        'ya.ru': {
            'host': 'smtp.yandex.ru',
            'port': 587,
            'use_tls': True,
            'use_ssl': False
        },
        'mail.ru': {
            'host': 'smtp.mail.ru',
            'port': 587,
            'use_tls': True,
            'use_ssl': False
        },
        'inbox.ru': {
            'host': 'smtp.mail.ru',
            'port': 587,
            'use_tls': True,
            'use_ssl': False
        },
        'list.ru': {
            'host': 'smtp.mail.ru',
            'port': 587,
            'use_tls': True,
            'use_ssl': False
        },
        'hotmail.com': {
            'host': 'smtp-mail.outlook.com',
            'port': 587,
            'use_tls': True,
            'use_ssl': False
        },
        'outlook.com': {
            'host': 'smtp-mail.outlook.com',
            'port': 587,
            'use_tls': True,
            'use_ssl': False
        },
        'live.com': {
            'host': 'smtp-mail.outlook.com',
            'port': 587,
            'use_tls': True,
            'use_ssl': False
        },
        'yahoo.com': {
            'host': 'smtp.mail.yahoo.com',
            'port': 587,
            'use_tls': True,
            'use_ssl': False
        },
        'yahoo.co.uk': {
            'host': 'smtp.mail.yahoo.com',
            'port': 587,
            'use_tls': True,
            'use_ssl': False
        },
        'aol.com': {
            'host': 'smtp.aol.com',
            'port': 587,
            'use_tls': True,
            'use_ssl': False
        },
        'zoho.com': {
            'host': 'smtp.zoho.com',
            'port': 587,
            'use_tls': True,
            'use_ssl': False
        },
        'icloud.com': {
            'host': 'smtp.mail.me.com',
            'port': 587,
            'use_tls': True,
            'use_ssl': False
        },
        'me.com': {
            'host': 'smtp.mail.me.com',
            'port': 587,
            'use_tls': True,
            'use_ssl': False
        },
        'rambler.ru': {
            'host': 'smtp.rambler.ru',
            'port': 587,
            'use_tls': True,
            'use_ssl': False
        }
    }
    
    # Возвращаем настройки для указанного домена или None
    return smtp_settings.get(domain)

def setup_email_config():
    """
    Автоматически настраивает параметры электронной почты на основе EMAIL_HOST_USER
    
    Returns:
        dict: Словарь с используемыми настройками
    """
    # Получаем оригинальный пароль
    orig_password = os.environ.get('EMAIL_HOST_PASSWORD', '')
    
    # Очищаем пароль от Unicode-символов, которые могут вызвать проблемы
    clean_password = sanitize_password(orig_password)
    
    # Если пароль был изменен, выводим предупреждение
    if clean_password != orig_password and orig_password:
        print("ВНИМАНИЕ: Пароль был автоматически очищен от специальных символов для совместимости с SMTP")
    
    # Используем стандартные настройки Gmail с очищенным паролем
    email_config = {
        'EMAIL_BACKEND': 'django.core.mail.backends.smtp.EmailBackend',
        'EMAIL_HOST': 'smtp.gmail.com',
        'EMAIL_PORT': 587,
        'EMAIL_USE_TLS': True,
        'EMAIL_USE_SSL': False,
        'EMAIL_HOST_USER': os.environ.get('EMAIL_HOST_USER', ''),
        'EMAIL_HOST_PASSWORD': clean_password,
        'DEFAULT_FROM_EMAIL': os.environ.get('EMAIL_HOST_USER', '')
    }
    
    # Определяем домен из адреса email
    email = os.environ.get('EMAIL_HOST_USER', '')
    domain = get_email_domain(email)
    
    if domain:
        print(f"Email настройки для {domain}:")
        print(f"SMTP сервер: {email_config['EMAIL_HOST']}")
        print(f"Порт: {email_config['EMAIL_PORT']}")
        print(f"TLS: {'Включен' if email_config['EMAIL_USE_TLS'] else 'Выключен'}")
        print(f"SSL: {'Включен' if email_config['EMAIL_USE_SSL'] else 'Выключен'}")
    else:
        print("Email настройки (стандартные):")
        print(f"SMTP сервер: {email_config['EMAIL_HOST']}")
        print(f"Порт: {email_config['EMAIL_PORT']}")
        print(f"TLS: {'Включен' if email_config['EMAIL_USE_TLS'] else 'Выключен'}")
        print(f"SSL: {'Включен' if email_config['EMAIL_USE_SSL'] else 'Выключен'}")
    
    return email_config

def apply_email_settings(sender_email=None, host=None, port=None, use_tls=None, use_ssl=None):
    """
    Применяет пользовательские настройки электронной почты или автоматически настраивает их
    
    Args:
        sender_email (str, optional): Адрес электронной почты отправителя
        host (str, optional): SMTP сервер
        port (int, optional): Порт SMTP сервера
        use_tls (bool, optional): Использовать TLS
        use_ssl (bool, optional): Использовать SSL
    
    Returns:
        dict: Словарь с используемыми настройками
    """
    email_config = setup_email_config()
    
    # Если адрес отправителя предоставлен, обновляем настройки
    if sender_email:
        email_config['EMAIL_HOST_USER'] = sender_email
        email_config['DEFAULT_FROM_EMAIL'] = sender_email
        os.environ['EMAIL_HOST_USER'] = sender_email
        os.environ['DEFAULT_FROM_EMAIL'] = sender_email
    
    # Если параметры SMTP предоставлены, используем их
    if host:
        email_config['EMAIL_HOST'] = host
        os.environ['EMAIL_HOST'] = host
        
    if port:
        email_config['EMAIL_PORT'] = port
        os.environ['EMAIL_PORT'] = str(port)
        
    if use_tls is not None:
        email_config['EMAIL_USE_TLS'] = use_tls
        os.environ['EMAIL_USE_TLS'] = str(use_tls).lower()
        
    if use_ssl is not None:
        email_config['EMAIL_USE_SSL'] = use_ssl
        os.environ['EMAIL_USE_SSL'] = str(use_ssl).lower()
    
    return email_config