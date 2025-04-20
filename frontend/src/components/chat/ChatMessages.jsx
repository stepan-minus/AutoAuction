import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Form, Spinner, Image } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime } from '../../utils/dateUtils';
import { fixAvatarUrl } from '../../utils/avatarHelper';

const ChatMessages = ({ conversation, onSendMessage, loading }) => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [error, setError] = useState('');

  // Автоматическая прокрутка при получении новых сообщений
  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages]);

  // Автоматическая прокрутка при первой загрузке
  useEffect(() => {
    if (conversation?.messages?.length > 0) {
      scrollToBottom();
    }
  }, [conversation]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Сообщение не может быть пустым');
      return;
    }
    
    setError('');
    onSendMessage(message.trim());
    setMessage('');
  };

  // Если диалог не загружен, показываем спиннер
  if (!conversation) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" />
        <p>Загрузка сообщений...</p>
      </div>
    );
  }

  return (
    <div className="chat-container">
      {error && (
        <Alert variant="danger" onClose={() => setError('')} dismissible className="m-2">
          {error}
        </Alert>
      )}
      
      <div className="chat-messages-container" ref={messagesContainerRef}>
        {conversation.messages && conversation.messages.length > 0 ? (
          <div className="chat-messages">
            {conversation.messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`message ${msg.sender && msg.sender.id === user.id ? 'message-own' : 'message-other'} ${msg.isTemp ? 'message-temp' : ''}`}
              >
                <div className="message-avatar">
                  {msg.sender?.profile?.avatar_url ? (
                    <Image 
                      src={fixAvatarUrl(msg.sender.profile.avatar_url)} 
                      roundedCircle 
                      className="avatar-image" 
                      alt={`Аватар ${msg.sender.username}`}
                      onError={(e) => {
                        console.error('Ошибка при загрузке аватара');
                        e.target.onerror = null;
                        e.target.src = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png';
                      }}
                    />
                  ) : (
                    <div className="avatar-placeholder">
                      {msg.sender ? msg.sender.username.charAt(0).toUpperCase() : 'П'}
                    </div>
                  )}
                </div>
                <div className="message-content">
                  <div className="message-text">
                    {msg.content}
                    {msg.isTemp && (
                      <small className="message-sending-status">
                        Отправляется...
                      </small>
                    )}
                  </div>
                  <div className="message-info">
                    <span className="message-sender">
                      {msg.sender ? msg.sender.username : 'Пользователь'}
                    </span>
                    <span className="message-time">
                      {msg.isTemp ? 'Отправка...' : formatDateTime(msg.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="text-center my-5">
            <p>Нет сообщений. Начните диалог!</p>
          </div>
        )}
      </div>
      
      <Form onSubmit={handleSubmit} className="chat-input">
        <div className="d-flex position-relative">
          <Form.Control
            as="textarea"
            placeholder="Введите сообщение..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={loading}
            autoFocus
            style={{ 
              resize: 'none', 
              overflowY: 'auto', 
              minHeight: '40px', 
              maxHeight: '120px',
              scrollbarWidth: 'none' // Скрываем scrollbar для Firefox
            }}
            className="hide-scrollbar" // Будем использовать класс для скрытия scrollbar в других браузерах
            onKeyDown={(e) => {
              // Отправка по Enter (без Ctrl)
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (message.trim()) {
                  onSendMessage(message.trim());
                  setMessage('');
                }
              }
              // Перенос строки по Shift+Enter
              else if (e.key === 'Enter' && e.shiftKey) {
                // Позволяем стандартное поведение - добавление новой строки
              }
            }}
          />
          <Button 
            type="submit" 
            className="skewed-button ms-2" 
            disabled={loading || !message.trim()}
          >
            {loading ? <Spinner size="sm" animation="border" /> : 'Отправить'}
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default ChatMessages;