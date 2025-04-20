from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse, HttpResponseRedirect
from django.views.generic import TemplateView
from django.urls import reverse

def api_root(request):
    """
    API Root view to provide information about available endpoints
    """
    api_info = {
        "name": "Авто Аукцион API",
        "version": "1.0.0",
        "description": "API для автомобильного аукциона",
        "endpoints": {
            "users": "/api/users/",
            "auction": "/api/auction/",
            "chat": "/api/chat/",
            "admin": "/admin/"
        },
        "frontend": "http://0.0.0.0:5001"
    }
    return JsonResponse(api_info, json_dumps_params={'ensure_ascii': False})

# Функция для перенаправления на корневой URL к админке
def redirect_to_admin(request):
    # Проверка, авторизован ли пользователь и является ли он админом
    if request.user.is_authenticated and (request.user.is_staff or request.user.is_superuser):
        return HttpResponseRedirect('/admin/')
    else:
        return HttpResponseRedirect('/admin/login/')

# Корень API
def status_ok(request):
    return JsonResponse({'status': 'ok'})

urlpatterns = [
    path('api/', api_root, name='api-root'),
    # Стандартная админка Django (теперь доступна по адресу /django-admin/)
    path('django-admin/', admin.site.urls),
    # Наша кастомная админка
    path('admin/', include('custom_admin.urls', namespace='custom_admin')),
    # Перенаправление с корневого URL на админку
    path('', redirect_to_admin),
    
    path('api/users/', include('users.urls')),
    path('api/auction/', include('auction.urls')),
    path('api/chat/', include('chat.urls')),
    
    # Дублируем URL маршруты без префикса /api для обратной совместимости
    path('chat/', include('chat.urls', namespace='chat_noprefix')),
    path('users/', include('users.urls', namespace='users_noprefix')),
    
    # Путь для статуса API (для проверки работоспособности)
    path('api/status/', status_ok, name='api-status'),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Удалили catch-all route, который мешал работе URL системы
