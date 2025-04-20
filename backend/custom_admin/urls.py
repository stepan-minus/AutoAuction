from django.urls import path
from . import views

app_name = 'custom_admin'

urlpatterns = [
    # Аутентификация
    path('login/', views.admin_login, name='admin_login'),
    path('logout/', views.admin_logout, name='admin_logout'),
    
    # Главная страница админки
    path('', views.admin_index, name='admin_index'),
    
    # Управление автомобилями (лотами)
    path('cars/', views.car_list, name='car_list'),
    path('cars/create/', views.car_create, name='car_create'),
    path('cars/<int:pk>/', views.car_detail, name='car_detail'),
    path('cars/<int:pk>/edit/', views.car_edit, name='car_edit'),
    path('cars/<int:pk>/delete/', views.car_delete, name='car_delete'),
    path('cars/<int:pk>/change-status/', views.car_change_status, name='car_change_status'),
    
    # Управление пользователями
    path('users/', views.user_list, name='user_list'),
    path('users/create/', views.user_create, name='user_create'),
    path('users/<int:pk>/', views.user_detail, name='user_detail'),
    path('users/<int:pk>/edit/', views.user_edit, name='user_edit'),
    path('users/<int:pk>/delete/', views.user_delete, name='user_delete'),
    
    # Управление ставками
    path('bids/', views.bid_list, name='bid_list'),
    path('bids/<int:pk>/delete/', views.bid_delete, name='bid_delete'),
    
    # Управление чатами
    path('chats/', views.chat_list, name='chat_list'),
    path('chats/<int:pk>/', views.chat_detail, name='chat_detail'),
    path('chats/<int:pk>/delete/', views.chat_delete, name='chat_delete'),
]