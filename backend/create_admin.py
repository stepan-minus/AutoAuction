import os
import django
import sys

# Добавляем текущий путь в sys.path
sys.path.append('.')

# Устанавливаем переменную окружения DJANGO_SETTINGS_MODULE
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Инициализируем Django
django.setup()

# Импортируем необходимые модули
from django.contrib.auth import get_user_model

# Определяем параметры пользователя
username = 'admin'
email = 'steppan792@gmail.com'
password = 'adminpass123'

User = get_user_model()

# Проверяем, существует ли уже пользователь с таким username или email
if User.objects.filter(username=username).exists():
    print(f"Пользователь с именем {username} уже существует.")
    user = User.objects.get(username=username)
    user.email = email
    user.set_password(password)
    user.is_staff = True
    user.is_superuser = True
    user.save()
    print(f"Обновлены данные пользователя {username}.")
elif User.objects.filter(email=email).exists():
    print(f"Пользователь с email {email} уже существует.")
    user = User.objects.get(email=email)
    user.username = username
    user.set_password(password)
    user.is_staff = True
    user.is_superuser = True
    user.save()
    print(f"Обновлены данные пользователя с email {email}, установлено новое имя пользователя {username}.")
else:
    # Создаем нового суперпользователя
    User.objects.create_superuser(username=username, email=email, password=password)
    print(f"Создан новый суперпользователь {username} с email {email}.")

print("Готово. Можно войти в админку с указанными учетными данными.")