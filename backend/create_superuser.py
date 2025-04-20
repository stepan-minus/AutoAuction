import os
import sys
import django

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from users.models import User

email = 'disonem204@isorax.com'
username = 'disonem204'
password = 'disonem204@isorax.com'

# Проверка существования пользователя
if User.objects.filter(email=email).exists():
    print(f"Пользователь с email {email} уже существует")
    sys.exit(0)

# Создание суперпользователя
user = User.objects.create_superuser(
    username=username,
    email=email,
    password=password
)

print(f"Суперпользователь {username} успешно создан")