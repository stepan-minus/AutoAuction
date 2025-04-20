import os
from pathlib import Path
from datetime import timedelta

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    # Get the directory of the settings file
    env_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
    # Check if .env file exists and load it
    if os.path.exists(env_path):
        load_dotenv(env_path)
        print(f"Loaded environment variables from {env_path}")
    else:
        print(f"Warning: Environment file not found at {env_path}")
except ImportError:
    print(
        "python-dotenv not installed. Environment variables may not be properly loaded."
    )

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('SECRET_KEY',
                       'django-insecure-key-for-development-only')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG', 'True') == 'True'

ALLOWED_HOSTS = ['*']
CSRF_TRUSTED_ORIGINS = [
    'https://*.replit.dev', 'https://*.repl.co',
    'https://*.janeway.replit.dev', 'https://*.janeway.replit.dev:3000',
    'https://*.pike.replit.dev', 'https://*.pike.replit.dev:3000',
    'https://*.sisko.replit.dev', 'https://*.sisko.replit.dev:3000',
    'https://0e2f668f-111f-4c65-8f33-19928876f0b3-00-1gvpljtesmhmg.sisko.replit.dev',
    'https://0e2f668f-111f-4c65-8f33-19928876f0b3-00-1gvpljtesmhmg.sisko.replit.dev:3000',
    'https://025e30f6-0e66-4829-bc38-a326f54c4984-00-3n83lah89xram.pike.replit.dev',
    'https://025e30f6-0e66-4829-bc38-a326f54c4984-00-3n83lah89xram.pike.replit.dev:3000',
    'https://4bb9a855-d17a-44ff-98fe-49b6e9959e70-00-3dbv3h4qcm9hl.janeway.replit.dev',
    'https://4bb9a855-d17a-44ff-98fe-49b6e9959e70-00-3dbv3h4qcm9hl.janeway.replit.dev:3000',
    'https://79659dab-7aa6-49d2-8229-a5c2c611e992-00-2ouspc8xrw4ad.worf.replit.dev',
    'https://79659dab-7aa6-49d2-8229-a5c2c611e992-00-2ouspc8xrw4ad.worf.replit.dev:3000'
]

CORS_ALLOWED_ORIGINS = CSRF_TRUSTED_ORIGINS
CORS_ALLOW_CREDENTIALS = True

# Application definition
INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'channels',

    # Local apps
    'users.apps.UsersConfig',
    'auction.apps.AuctionConfig',
    'chat.apps.ChatConfig',
    'custom_admin.apps.CustomAdminConfig',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

ASGI_APPLICATION = 'config.asgi.application'

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer'
    }
}
ASGI_APPLICATION = 'config.asgi.application'

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME':
        'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME':
        'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME':
        'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME':
        'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'ru'
TIME_ZONE = 'Asia/Novosibirsk'  # GMT+7 (Новосибирск)
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom user model
AUTH_USER_MODEL = 'users.User'

# Frontend URL for media files generation in production
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://0.0.0.0:5001')

# Backend URL for media files
BACKEND_URL = os.environ.get('BACKEND_URL', 'http://0.0.0.0:5000')

# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES':
    ('rest_framework.permissions.IsAuthenticated', ),
}

# JWT settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUTH_HEADER_TYPES': ('Bearer', ),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken', ),
    'TOKEN_TYPE_CLAIM': 'token_type',
}

# CORS settings
CORS_ALLOW_ALL_ORIGINS = True  # For development, restrict in production
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = CSRF_TRUSTED_ORIGINS  # Ensure CORS origins match CSRF trusted origins

# Channels settings
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    },
}

# Email settings
# Используем автоматическую настройку SMTP на основе указанного email-адреса
try:
    from utils.email_config import setup_email_config
    email_config = setup_email_config()
    
    # Применяем настройки email из конфигурации
    EMAIL_BACKEND = email_config.get('EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend')
    EMAIL_HOST = email_config.get('EMAIL_HOST', 'smtp.gmail.com')
    EMAIL_PORT = email_config.get('EMAIL_PORT', 587)
    EMAIL_USE_TLS = email_config.get('EMAIL_USE_TLS', True)
    EMAIL_USE_SSL = email_config.get('EMAIL_USE_SSL', False)
    EMAIL_HOST_USER = email_config.get('EMAIL_HOST_USER', os.getenv('EMAIL_HOST_USER', ''))
    EMAIL_HOST_PASSWORD = email_config.get('EMAIL_HOST_PASSWORD', os.getenv('EMAIL_HOST_PASSWORD', ''))
    DEFAULT_FROM_EMAIL = email_config.get('DEFAULT_FROM_EMAIL', EMAIL_HOST_USER)
    
    # Сохраняем настройки в переменные окружения для других скриптов
    os.environ['EMAIL_HOST'] = EMAIL_HOST
    os.environ['EMAIL_PORT'] = str(EMAIL_PORT)
    os.environ['EMAIL_USE_TLS'] = str(EMAIL_USE_TLS).lower()
    os.environ['EMAIL_USE_SSL'] = str(EMAIL_USE_SSL).lower()
    
    print("Режим отправки email: РЕАЛЬНАЯ ОТПРАВКА (SMTP)")
except Exception as e:
    # В случае ошибки используем стандартные настройки
    print(f"Ошибка настройки email: {e}")
    print("Используем стандартные настройки email")
    
    # Стандартные настройки для Gmail
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = 'smtp.gmail.com'
    EMAIL_PORT = 587
    EMAIL_USE_TLS = True
    EMAIL_USE_SSL = False
    EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
    EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
    DEFAULT_FROM_EMAIL = EMAIL_HOST_USER
    
    # Сохраняем настройки в переменные окружения
    os.environ['EMAIL_HOST'] = EMAIL_HOST
    os.environ['EMAIL_PORT'] = str(EMAIL_PORT)
    os.environ['EMAIL_USE_TLS'] = 'true'
    os.environ['EMAIL_USE_SSL'] = 'false'
    
    print("Режим отправки email: РЕАЛЬНАЯ ОТПРАВКА (SMTP)")

# Режим отладки для тестирования шаблонов (закомментирован для продакшена)
# EMAIL_BACKEND = 'django.core.mail.backends.filebased.EmailBackend'
# EMAIL_FILE_PATH = os.path.join(BASE_DIR, 'sent_emails')
# os.makedirs(EMAIL_FILE_PATH, exist_ok=True)
# print(f"Режим отправки email: ТЕСТОВЫЙ (файлы в {EMAIL_FILE_PATH})")

# Already defined earlier
# FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5000')

# Bind to proper host and port
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Authentication URLs
LOGIN_URL = '/admin/login/'  # Redirect to custom admin login
LOGOUT_URL = '/admin/logout/'
LOGIN_REDIRECT_URL = '/admin/'
