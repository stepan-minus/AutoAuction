#!/usr/bin/env python
"""
Скрипт для обновления пароля электронной почты.
Проверяет текущий пароль в .env и заменяет его на новый без Unicode символов.
"""
import os
import sys
import logging
import re

# Настройка логирования
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

# Добавляем родительскую директорию в sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Загружаем переменные окружения
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
if os.path.exists(env_path):
    print(f"Найден файл .env: {env_path}")
else:
    print(f"❌ Файл .env не найден по пути {env_path}")
    sys.exit(1)

# Функция для удаления специальных символов из пароля
def sanitize_password(password):
    """
    Очищает пароль от специальных символов Unicode, которые могут вызвать проблемы
    с SMTP-серверами. В частности заменяет em dash (—) на обычный дефис (-).
    """
    if not password:
        return password
    
    # Заменяем em dash (—) на обычный дефис (-)
    password = password.replace('\u2014', '-')
    
    # Тут можно добавить другие замены проблемных символов
    return password

# Функция для обновления пароля в .env файле
def update_password_in_env(new_password):
    """Обновляет EMAIL_HOST_PASSWORD в .env файле"""
    with open(env_path, 'r', encoding='utf-8') as file:
        lines = file.readlines()
    
    updated = False
    new_lines = []
    
    for line in lines:
        if line.strip().startswith('EMAIL_HOST_PASSWORD='):
            # Получаем текущий пароль (может быть в кавычках)
            current_password_match = re.match(r'EMAIL_HOST_PASSWORD=(?:"([^"]*)"|\'([^\']*)\'|(.*))$', line.strip())
            if current_password_match:
                # Находим первую непустую группу
                current_password = next((g for g in current_password_match.groups() if g is not None), "")
                logger.info(f"Текущий пароль: {current_password}")
                
                # Определяем, нужны ли кавычки
                quotes = '"' if '"' in line else "'" if "'" in line else ""
                new_line = f'EMAIL_HOST_PASSWORD={quotes}{new_password}{quotes}\n'
                new_lines.append(new_line)
                updated = True
                logger.info(f"Обновлено значение EMAIL_HOST_PASSWORD")
            else:
                new_lines.append(line)
        else:
            new_lines.append(line)
    
    if not updated:
        logger.warning("❌ EMAIL_HOST_PASSWORD не найден в .env файле")
        return False
    
    with open(env_path, 'w', encoding='utf-8') as file:
        file.writelines(new_lines)
    
    return True

def get_current_password():
    """Получает текущий пароль из .env файла"""
    with open(env_path, 'r', encoding='utf-8') as file:
        lines = file.readlines()
    
    for line in lines:
        if line.strip().startswith('EMAIL_HOST_PASSWORD='):
            password_match = re.match(r'EMAIL_HOST_PASSWORD=(?:"([^"]*)"|\'([^\']*)\'|(.*))$', line.strip())
            if password_match:
                # Находим первую непустую группу
                return next((g for g in password_match.groups() if g is not None), "")
    
    return None

def main():
    """Основная функция скрипта"""
    print("\n===== ПРОВЕРКА И ОБНОВЛЕНИЕ ПАРОЛЯ EMAIL =====")
    
    # Получаем текущий пароль из .env
    current_password = get_current_password()
    
    if current_password is None:
        print("❌ EMAIL_HOST_PASSWORD не найден в .env файле")
        return
    
    # Очищаем пароль от специальных символов
    cleaned_password = sanitize_password(current_password)
    
    # Сравниваем текущий и очищенный пароли
    if current_password == cleaned_password:
        print("✅ Пароль не содержит специальных символов Unicode.")
    else:
        print("⚠️ Обнаружены специальные символы Unicode в пароле!")
        print(f"Оригинальный пароль: {current_password}")
        print(f"Очищенный пароль:   {cleaned_password}")
        
        # Обновляем пароль в .env файле
        choice = input("\nОбновить пароль без специальных символов? (y/n): ")
        if choice.lower() == 'y':
            if update_password_in_env(cleaned_password):
                print("✅ Пароль успешно обновлен.")
            else:
                print("❌ Не удалось обновить пароль.")
        else:
            print("❌ Обновление пароля отменено.")
    
    print("\nДля применения изменений перезапустите сервер Django.")

# Предлагаем обновить пароль на новый, если передан как аргумент
if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--update" and len(sys.argv) > 2:
        # Если передан параметр --update и новый пароль, обновляем пароль
        new_password = sys.argv[2]
        
        # Очищаем пароль от специальных символов
        cleaned_password = sanitize_password(new_password)
        
        print(f"Новый пароль: {new_password}")
        print(f"Очищенный пароль: {cleaned_password}")
        
        if update_password_in_env(cleaned_password):
            print("✅ Пароль успешно обновлен.")
        else:
            print("❌ Не удалось обновить пароль.")
    else:
        main()