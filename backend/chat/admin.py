from django.contrib import admin
from .models import Conversation, Message

class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ['sender', 'content', 'timestamp', 'is_read']
    can_delete = False
    
    def has_add_permission(self, request, obj=None):
        return False

@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ['id', 'get_participants', 'car', 'created_at', 'updated_at']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['participants__username', 'car__brand', 'car__model']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [MessageInline]
    
    def get_participants(self, obj):
        return ", ".join([user.username for user in obj.participants.all()])
    get_participants.short_description = 'Участники'

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['id', 'sender', 'get_conversation', 'short_content', 'timestamp', 'is_read']
    list_filter = ['timestamp', 'is_read', 'sender']
    search_fields = ['content', 'sender__username']
    readonly_fields = ['timestamp']
    
    def get_conversation(self, obj):
        return f"Диалог #{obj.conversation.id}"
    get_conversation.short_description = 'Диалог'
    
    def short_content(self, obj):
        return obj.content[:50] + ('...' if len(obj.content) > 50 else '')
    short_content.short_description = 'Сообщение'