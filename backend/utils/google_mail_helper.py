#!/usr/bin/env python
"""
Скрипт помощник для настройки отправки почты через Gmail
"""

import os
import webbrowser
import time
from datetime import datetime

def show_gmail_2fa_instructions():
    """
    Выводит инструкции по настройке двухфакторной аутентификации и пароля приложения
    для аккаунта Gmail.
    """
    print("=" * 80)
    print("НАСТРОЙКА ОТПРАВКИ ПОЧТЫ ЧЕРЕЗ GMAIL")
    print("=" * 80)
    print("\nДля использования Gmail в качестве SMTP-сервера требуется:")
    print("1. Включить двухфакторную аутентификацию (2FA) на вашем аккаунте Google")
    print("2. Создать специальный пароль приложения для использования с этим приложением\n")
    
    print("--- ШАГ 1: ВКЛЮЧЕНИЕ ДВУХФАКТОРНОЙ АУТЕНТИФИКАЦИИ ---")
    print("1. Перейдите по ссылке: https://myaccount.google.com/security")
    print("2. Найдите раздел 'Двухэтапная аутентификация' и нажмите 'Начать'")
    print("3. Следуйте инструкциям на экране для включения 2FA\n")
    
    open_browser = input("Открыть страницу безопасности Google в браузере? (д/н): ")
    if open_browser.lower() in ['д', 'да', 'y', 'yes']:
        try:
            webbrowser.open("https://myaccount.google.com/security")
            print("Браузер открыт. Включите двухфакторную аутентификацию.")
        except Exception as e:
            print(f"Не удалось открыть браузер: {e}")
            print("Пожалуйста, откройте ссылку вручную: https://myaccount.google.com/security")
    
    print("\nПосле включения 2FA, нажмите Enter для продолжения...")
    input()
    
    print("\n--- ШАГ 2: СОЗДАНИЕ ПАРОЛЯ ПРИЛОЖЕНИЯ ---")
    print("1. Перейдите по ссылке: https://myaccount.google.com/apppasswords")
    print("2. В разделе 'Приложение' выберите 'Другое (указать название)'")
    print("3. Введите название, например 'AutoAuction'")
    print("4. Нажмите 'Создать'")
    print("5. Google создаст и покажет 16-символьный пароль приложения")
    print("6. Скопируйте этот пароль и сохраните его (он будет показан только один раз!)\n")
    
    open_browser = input("Открыть страницу паролей приложений в браузере? (д/н): ")
    if open_browser.lower() in ['д', 'да', 'y', 'yes']:
        try:
            webbrowser.open("https://myaccount.google.com/apppasswords")
            print("Браузер открыт. Создайте пароль приложения.")
        except Exception as e:
            print(f"Не удалось открыть браузер: {e}")
            print("Пожалуйста, откройте ссылку вручную: https://myaccount.google.com/apppasswords")
    
    print("\nПосле создания пароля приложения, введите его ниже (без пробелов).")
    app_password = input("Пароль приложения: ")
    
    if not app_password:
        print("Вы не ввели пароль приложения. Настройка не завершена.")
        return
    
    # Сохраняем пароль приложения
    print("\nСоздаем или обновляем файл .env с новым паролем...")
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
    
    # Сначала прочитаем существующий .env файл, если он есть
    env_lines = []
    email_user_line = None
    email_pwd_line = None
    
    if os.path.exists(env_path):
        with open(env_path, 'r') as env_file:
            env_lines = env_file.readlines()
            
        # Резервная копия старого .env файла
        backup_path = f"{env_path}.backup-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        with open(backup_path, 'w') as backup_file:
            backup_file.writelines(env_lines)
        print(f"Создана резервная копия .env: {backup_path}")
    
    # Проверяем/обновляем строки с EMAIL_HOST_USER и EMAIL_HOST_PASSWORD
    for i, line in enumerate(env_lines):
        if line.strip().startswith("EMAIL_HOST_USER="):
            email_user_line = i
        elif line.strip().startswith("EMAIL_HOST_PASSWORD="):
            email_pwd_line = i
    
    # Получаем email пользователя
    email_user = None
    if email_user_line is not None:
        email_user = env_lines[email_user_line].strip().split('=', 1)[1].strip('"\'')
    
    if not email_user:
        email_user = input("\nВведите адрес электронной почты Gmail: ")
    else:
        print(f"\nНайден адрес электронной почты: {email_user}")
        change_email = input("Изменить адрес? (д/н): ")
        if change_email.lower() in ['д', 'да', 'y', 'yes']:
            email_user = input("Введите новый адрес электронной почты Gmail: ")
    
    # Обновляем или добавляем строки в env_lines
    if email_user_line is not None:
        env_lines[email_user_line] = f'EMAIL_HOST_USER="{email_user}"\n'
    else:
        env_lines.append(f'EMAIL_HOST_USER="{email_user}"\n')
    
    if email_pwd_line is not None:
        env_lines[email_pwd_line] = f'EMAIL_HOST_PASSWORD="{app_password}"\n'
    else:
        env_lines.append(f'EMAIL_HOST_PASSWORD="{app_password}"\n')
    
    # Убедимся, что EMAIL_HOST и EMAIL_PORT установлены для Gmail
    host_found = False
    port_found = False
    for i, line in enumerate(env_lines):
        if line.strip().startswith("EMAIL_HOST="):
            env_lines[i] = 'EMAIL_HOST="smtp.gmail.com"\n'
            host_found = True
        elif line.strip().startswith("EMAIL_PORT="):
            env_lines[i] = 'EMAIL_PORT="587"\n'
            port_found = True
    
    if not host_found:
        env_lines.append('EMAIL_HOST="smtp.gmail.com"\n')
    if not port_found:
        env_lines.append('EMAIL_PORT="587"\n')
    
    # Записываем обновленный .env файл
    with open(env_path, 'w') as env_file:
        env_file.writelines(env_lines)
    
    print("\n✅ Настройки сохранены в файл .env")
    print("✅ Для применения изменений перезапустите сервер Django")
    
    return {
        'success': True, 
        'message': 'Пароль приложения успешно сохранен',
        'email': email_user,
        'app_password': '*' * len(app_password)  # Не показываем сам пароль
    }

if __name__ == "__main__":
    # Запускаем гайд по настройке Gmail
    show_gmail_2fa_instructions()