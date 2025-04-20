import React, { useState, useEffect, useRef } from 'react';
import { Alert, Button, Spinner, Image } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import ChatMessages from './ChatMessages';
import chatService from '../../services/chatService';
import webSocketService from '../../services/webSocketService';
import { fixAvatarUrl } from '../../utils/avatarHelper';
import { constructWebSocketUrl } from '../../utils/ws';

const ChatWindow = ({ conversation, onUpdate, user }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const webSocketRef = useRef(null);
  const [chatData, setChatData] = useState(null);

  // Загрузка полных данных о диалоге
  useEffect(() => {
    const loadConversationData = async () => {
      if (!conversation) return;
      
      setLoading(true);
      try {
        const data = await chatService.getConversation(conversation.id);
        setChatData(data);
        
        // Подключаемся к WebSocket при загрузке данных
        connectToWebSocket(conversation.id);
      } catch (err) {
        console.error('Ошибка при загрузке диалога:', err);
        setError('Не удалось загрузить сообщения. Попробуйте обновить страницу.');
      } finally {
        setLoading(false);
      }
    };
    
    loadConversationData();
    
    // Очистка при размонтировании компонента
    return () => {
      if (webSocketRef.current) {
        webSocketRef.current.close();
      }
    };
  }, [conversation]);

  // Подключение к WebSocket
  const connectToWebSocket = (convId) => {
    // Закрываем предыдущее соединение, если есть
    if (webSocketRef.current) {
      webSocketRef.current.close();
      console.log(`Закрываем WebSocket соединение для диалога ${convId}`);
    }
    
    // Используем нашу функцию для формирования URL
    const wsUrl = constructWebSocketUrl(`chat/${convId}`);
    
    // Создаем новое соединение через WebSocketService
    const connectionId = `chat_${convId}`;
    const callbacks = {
      onOpen: (event) => {
        console.log(`WebSocket соединение установлено для диалога ${convId}`);
      },
      onMessage: (event) => {
        try {
          // Обрабатываем входящие данные, преобразуя в объект, если это строка
          let data;
          if (typeof event.data === 'string') {
            data = JSON.parse(event.data);
          } else {
            data = event;
          }
          
          console.log('Получено WebSocket сообщение:', data);
          
          // Обрабатываем сообщения разных типов
          if (data.type === 'message') {
            console.log('Получено новое сообщение через WebSocket:', data.message);
            
            // Обновляем диалог при получении нового сообщения
            setChatData(prev => {
              if (!prev) return prev;
              
              // Проверяем, не дублируется ли сообщение
              const messageExists = prev.messages.some(msg => msg.id === data.message.id);
              if (messageExists) {
                console.log('Сообщение уже существует в диалоге, игнорируем:', data.message.id);
                return prev;
              }
              
              console.log('Добавляем новое входящее сообщение в диалог:', data.message);
              
              // Добавляем новое сообщение в список
              return {
                ...prev,
                messages: [...prev.messages, data.message]
              };
            });
            
            // Уведомляем родительский компонент об обновлении
            if (onUpdate) onUpdate();
          } else if (data.type === 'message_sent') {
            // Обрабатываем подтверждение отправки сообщения
            console.log('Получено подтверждение отправки сообщения:', data.message);
            
            setChatData(prev => {
              if (!prev) return prev;
              
              // Ищем временное сообщение с таким же содержимым, чтобы заменить его
              const newMessages = prev.messages.map(msg => {
                // Если это временное сообщение с тем же содержимым и отправителем - заменяем его
                if (msg.isTemp && msg.content === data.message.content && 
                    msg.sender.id === data.message.sender.id) {
                  console.log('Заменяем временное сообщение на подтвержденное:', msg.id, '->', data.message.id);
                  return {
                    ...data.message,
                    isTemp: false
                  };
                }
                return msg;
              });
              
              return {
                ...prev,
                messages: newMessages
              };
            });
          } else if (data.type === 'error') {
            // Обрабатываем ошибки от сервера
            console.error('Ошибка WebSocket от сервера:', data.message);
            setError(`Ошибка отправки: ${data.message}`);
          } else if (data.type === 'ping' || data.type === 'pong') {
            // Просто логируем пинг/понг сообщения
            console.log(`Получено ${data.type} сообщение через WebSocket`);
          }
        } catch (err) {
          console.error('Ошибка при обработке сообщения WebSocket:', err);
        }
      },
      onError: (error) => {
        console.error('WebSocket ошибка:', error);
      },
      onClose: (event) => {
        console.log(`WebSocket соединение закрыто для диалога ${convId}. Код: ${event.code}, Причина: ${event.reason}`);
      }
    };
    
    // Создаем новое WebSocket соединение через сервис
    const ws = webSocketService.createConnection(wsUrl, connectionId, callbacks);
    webSocketRef.current = ws;
  };

  // Отправка сообщения через WebSocket с резервным использованием HTTP
  const handleSendMessage = async (content) => {
    if (!chatData || !content.trim()) return;
    
    setSendingMessage(true);
    try {
      // Генерируем временный ID для сообщения
      const tempId = `temp_${Date.now()}`;
      let messageAdded = false;
      
      // Создаем временный объект сообщения для быстрого отображения в UI
      const tempMessage = {
        id: tempId,
        conversation: chatData.id,
        sender: user,
        content: content,
        timestamp: new Date().toISOString(),
        is_read: false,
        isTemp: true // Флаг для идентификации временного сообщения
      };
      
      // Добавляем временное сообщение в UI немедленно
      setChatData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: [...prev.messages, tempMessage]
        };
      });
      messageAdded = true;
      
      // Попытка отправки через WebSocket
      let wsSuccess = false;
      if (webSocketRef.current && webSocketRef.current.readyState === WebSocket.OPEN) {
        console.log('Отправка сообщения через WebSocket:', content);
        wsSuccess = webSocketService.sendMessage(`chat_${chatData.id}`, {
          type: 'message',
          content: content,
          temp_id: tempId // Передаем временный ID для сопоставления
        });
        
        if (wsSuccess) {
          console.log('Сообщение успешно отправлено через WebSocket');
          // После успешной отправки через WebSocket ждем 2 секунды для получения обновления
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      // Если WebSocket не доступен или отправка не удалась, используем HTTP
      let response;
      if (!wsSuccess) {
        console.log('Отправка через HTTP как запасной вариант:', content);
        response = await chatService.sendMessageHttp(chatData.id, content);
        console.log('Ответ от HTTP запроса:', response);
        
        // Заменяем временное сообщение на реальное
        if (messageAdded) {
          setChatData(prev => {
            if (!prev) return prev;
            
            // Находим и заменяем временное сообщение
            const updatedMessages = prev.messages.map(msg => {
              if (msg.id === tempId) {
                return {
                  ...response, // Используем данные из ответа сервера
                  sender: user // Сохраняем информацию о отправителе
                };
              }
              return msg;
            });
            
            return {
              ...prev,
              messages: updatedMessages
            };
          });
        }
      }
      
      // Уведомляем родительский компонент об обновлении
      if (onUpdate) onUpdate();
      
    } catch (err) {
      console.error('Ошибка при отправке сообщения:', err);
      setError('Не удалось отправить сообщение. Проверьте соединение и попробуйте еще раз.');
    } finally {
      setSendingMessage(false);
    }
  };

  // Функция для получения данных о собеседнике
  const getParticipantInfo = () => {
    if (!chatData) return { username: 'Загрузка...' };
    
    // Находим собеседника (не текущего пользователя)
    const otherParticipant = chatData.participants.find(p => p.id !== user.id);
    
    if (otherParticipant) {
      return {
        username: otherParticipant.username,
        avatar: otherParticipant.username.charAt(0).toUpperCase(),
        avatarUrl: otherParticipant.profile?.avatar_url,
        id: otherParticipant.id
      };
    }
    
    return { username: 'Пользователь', avatar: 'П' };
  };
  
  // Функция для определения информации об автомобиле
  const getCarInfo = () => {
    if (!chatData) return '';
    
    if (chatData.car && 
        chatData.car.brand && 
        chatData.car.model && 
        chatData.car.brand !== 'undefined' && 
        chatData.car.model !== 'undefined') {
      return `${chatData.car.brand} ${chatData.car.model}`;
    }
    
    return '';
  };

  // Если нет данных о диалоге, показываем спиннер
  if (!chatData && loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" />
        <p>Загрузка сообщений...</p>
      </div>
    );
  }

  return (
    <div className="chat-window">
      {error && (
        <Alert variant="danger" onClose={() => setError('')} dismissible>
          {error}
        </Alert>
      )}
      
      <div className="chat-header">
        <div className="chat-header-user">
          <div className="chat-header-avatar">
            {getParticipantInfo().avatarUrl ? (
              <Image 
                src={fixAvatarUrl(getParticipantInfo().avatarUrl)} 
                roundedCircle 
                className="avatar-image" 
                alt={`Аватар ${getParticipantInfo().username}`} 
                onError={(e) => {
                  console.error('Ошибка загрузки аватара:', e);
                  e.target.onerror = null;
                  e.target.src = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png';
                }}
              />
            ) : (
              <div className="avatar-placeholder">
                {getParticipantInfo().avatar}
              </div>
            )}
          </div>
          <div className="chat-header-info">
            <div className="chat-header-username">
              {getParticipantInfo().username}
            </div>
            {getCarInfo() && (
              <div className="chat-header-car">
                {getCarInfo()}
              </div>
            )}
          </div>
        </div>
        
        {chatData && chatData.car && chatData.car.id && chatData.car.id !== 'undefined' && (
          <Button 
            variant="outline-primary" 
            size="sm"
            onClick={() => navigate(`/auction/${chatData.car.id}`)}
            className="view-auction-btn"
          >
            Просмотреть аукцион
          </Button>
        )}
      </div>
      
      <ChatMessages 
        conversation={chatData}
        onSendMessage={handleSendMessage}
        loading={sendingMessage}
      />
    </div>
  );
};

export default ChatWindow;