#!/bin/bash
# Запуск Django сервера с включенной реальной отправкой email
export USE_REAL_EMAIL=true
echo "Режим отправки email: РЕАЛЬНАЯ ОТПРАВКА (SMTP)"
python manage.py runserver 0.0.0.0:5000