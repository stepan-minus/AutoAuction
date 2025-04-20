from django.urls import path
from . import views

app_name = 'chat'

urlpatterns = [
    path('conversations/', views.ConversationListView.as_view(), name='conversation-list'),
    path('conversations/<int:pk>/', views.ConversationDetailView.as_view(), name='conversation-detail'),
    path('conversations/<int:conversation_id>/messages/', views.MessageCreateView.as_view(), name='message-create'),
    
    # Стандартный путь для создания диалога по ID автомобиля
    path('cars/<int:car_id>/start-conversation/', views.start_conversation, name='start-conversation'),
]