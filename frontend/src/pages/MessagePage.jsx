import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import chatService from '../services/chatService';
import webSocketService from '../services/webSocketService';
import { getUserAvatarUrl, handleAvatarError } from '../utils/avatarHelper';

const MessagePage = () => {
  const { conversationId } = useParams();
  const { user, authTokens } = useAuth();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Функция для прокрутки вниз к последнему сообщению
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Получить имя собеседника (не текущего пользователя)
  const getOtherParticipantName = () => {
    if (!conversation || !user || !conversation.participants) {
      return 'Пользователь';
    }
    
    // Надежно определяем ID текущего пользователя
    const currentUserId = user.user_id || user.id;
    const currentUsername = user.username;
    
    // Находим пользователя, который не является текущим
    const otherParticipant = conversation.participants.find(p => {
      // Проверяем по ID и по имени пользователя
      return (p.id !== currentUserId) && (p.username !== currentUsername);
    });
    
    if (!otherParticipant) {
      console.log('Не удалось найти другого участника в диалоге:', conversation);
      return 'Пользователь';
    }
    
    // Проверяем корректность данных собеседника
    const displayName = otherParticipant.username || 'Пользователь';
    return displayName;
  };
  
  // Получить аватар собеседника
  const getOtherParticipantAvatar = () => {
    if (!conversation || !user || !conversation.participants) {
      return 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png';
    }
    
    // Надежно определяем ID текущего пользователя
    const currentUserId = user.user_id || user.id;
    const currentUsername = user.username;
    
    // Находим пользователя, который не является текущим
    const otherParticipant = conversation.participants.find(p => {
      // Проверяем по ID и по имени пользователя
      return (p.id !== currentUserId) && (p.username !== currentUsername);
    });
    
    if (!otherParticipant) {
      console.log('Не удалось найти другого участника для аватара в диалоге:', conversation);
      return 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png';
    }
    
    return getUserAvatarUrl(otherParticipant);
  };
  
  // Получить аватар текущего пользователя
  const getCurrentUserAvatar = () => {
    return getUserAvatarUrl(user);
  };

  // Загрузить информацию о диалоге
  useEffect(() => {
    const fetchConversation = async () => {
      // Проверяем наличие токенов и ID диалога
      if (!authTokens) {
        console.log('Ожидание токенов авторизации...');
        return; // Выходим из функции и ждем следующего вызова useEffect когда authTokens будет доступен
      }

      if (!conversationId) {
        console.error('Отсутствует ID диалога');
        setError('Не удалось загрузить диалог: ID диалога не указан');
        setLoading(false);
        return;
      }

      try {
        console.log(`Загружаем информацию о диалоге ${conversationId} с токеном: ${authTokens.access.substring(0, 10)}...`);
        setLoading(true);
        
        const conversationData = await chatService.getConversation(conversationId);
        console.log('Данные диалога получены:', conversationData);
        
        if (!conversationData) {
          console.error('Диалог не найден');
          setError('Диалог не найден');
          setLoading(false);
          return;
        }

        setConversation(conversationData);
        setMessages(conversationData.messages || []);
        setLoading(false);
      } catch (err) {
        console.error('Ошибка при загрузке диалога:', err);
        
        // Проверяем тип ошибки
        if (err.response && err.response.status === 401) {
          setError('Ошибка авторизации. Пожалуйста, войдите в систему снова.');
        } else if (err.response && err.response.status === 404) {
          setError('Диалог не найден.');
        } else {
          setError(`Не удалось загрузить диалог: ${err.message}`);
        }
        
        setLoading(false);
      }
    };

    // Вызываем функцию только если есть authTokens
    if (authTokens) {
      fetchConversation();
    }
  }, [authTokens, conversationId]);

  // Подключение к WebSocket через сервис
  useEffect(() => {
    // Убедимся, что есть и conversationId, и authTokens
    if (!authTokens) {
      console.log('Ожидание токенов авторизации для WebSocket...');
      return;
    }
    
    if (!conversationId) {
      console.log('Отсутствует ID диалога для WebSocket');
      return;
    }

    // Создаем WebSocket соединение только после загрузки диалога
    if (!conversation) {
      console.log('Ожидание загрузки данных диалога для подключения WebSocket...');
      return;
    }

    // Уникальный идентификатор для этого соединения
    const connectionId = `chat_${conversationId}`;
    
    // URL для WebSocket соединения
    // Используем корректный URL для WebSocket соединения в среде Replit
    const host = window.location.host;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${host}/ws/chat/${conversationId}/?token=${authTokens.access}`;
    
    // Настраиваем колбеки для событий WebSocket
    const callbacks = {
      onOpen: (event) => {
        console.log(`WebSocket соединение установлено для диалога ${conversationId}`);
      },
      
      onMessage: (event) => {
        console.log('Получено сообщение через WebSocket:', event.data);
        try {
          const data = JSON.parse(event.data);
          
          // Проверяем тип сообщения
          if (data.type === 'message' && data.message) {
            console.log('Получено новое сообщение через WebSocket:', data.message);
            
            // Проверка, является ли сообщение дубликатом или временным сообщением
            const isDuplicate = messages.some(msg => 
              (msg.id === data.message.id) || 
              (msg.temp && msg.content === data.message.content && 
               msg.sender && data.message.sender && 
               msg.sender.id === data.message.sender.id)
            );
            
            if (!isDuplicate) {
              // Добавляем новое сообщение к списку, заменяя временное если оно есть
              setMessages(prevMessages => {
                // Сначала удаляем все временные сообщения с таким же контентом от того же отправителя
                const filteredMessages = prevMessages.filter(msg => 
                  !(msg.temp && msg.content === data.message.content && 
                    msg.sender && data.message.sender && 
                    msg.sender.id === data.message.sender.id)
                );
                
                // Затем добавляем новое сообщение
                return [...filteredMessages, data.message];
              });
              
              // Автоматическая прокрутка к новому сообщению
              scrollToBottom();
            }
          } 
          else if (data.type === 'message_sent' && data.message) {
            console.log('Получено подтверждение отправки сообщения:', data.message);
            
            // Заменяем временное сообщение на подтвержденное
            if (data.message.temp_id) {
              setMessages(prevMessages => {
                // Ищем временное сообщение по ID и заменяем его
                const updatedMessages = prevMessages.filter(msg => 
                  !(msg.temp && msg.id.toString() === data.message.temp_id)
                );
                return [...updatedMessages, data.message];
              });
            }
          }
          else if (data.type === 'pong') {
            console.log('Получен pong от сервера');
          }
        } catch (error) {
          console.error('Ошибка при парсинге сообщения WebSocket:', error);
        }
      },
      
      onError: (error) => {
        console.error('WebSocket ошибка для диалога', conversationId, ':', error);
      },
      
      onClose: (event) => {
        console.log(`WebSocket соединение закрыто для диалога ${conversationId}. Код: ${event.code}, Причина: ${event.reason}`);
      },
      
      onReconnectFailed: () => {
        setError('Не удалось установить соединение с сервером после нескольких попыток. Пожалуйста, обновите страницу.');
      }
    };
    
    // Создаем соединение через сервис
    const ws = webSocketService.createConnection(wsUrl, connectionId, callbacks);
    setSocket(ws);
    
    // Очистка при размонтировании компонента
    return () => {
      console.log(`Закрываем WebSocket соединение для диалога ${conversationId}`);
      webSocketService.closeConnection(connectionId);
    };
  }, [conversationId, authTokens, conversation]);

  // Автоматическая прокрутка к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  


  // Отправка сообщения (пробуем через WebSocket, с fallback на HTTP)
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) {
      return;
    }
    
    const messageContent = newMessage.trim();
    setNewMessage(''); // Сразу очищаем поле ввода
    setIsSending(true);
    
    try {
      // Генерируем временный ID для отслеживания сообщения
      const tempId = Date.now().toString();
      
      // Пробуем отправить через WebSocket, если он доступен
      if (socket && socket.readyState === WebSocket.OPEN) {
        console.log('Отправка сообщения через WebSocket');
        socket.send(JSON.stringify({
          type: 'message',
          content: messageContent,
          temp_id: tempId
        }));
        
        // Создаем временный объект сообщения для немедленного отображения
        const tempMsg = {
          id: tempId,
          conversation: parseInt(conversationId),
          sender: user,
          content: messageContent,
          timestamp: new Date().toISOString(),
          is_read: false,
          temp: true
        };
        
        // Добавляем сообщение в список для моментального отображения
        setMessages(prevMessages => [...prevMessages, tempMsg]);
      } else {
        // Fallback на HTTP если WebSocket недоступен
        console.log('WebSocket недоступен, отправка через HTTP');
        
        // Создаем временный объект сообщения для немедленного отображения
        const tempMsg = {
          id: tempId,
          conversation: parseInt(conversationId),
          sender: user,
          content: messageContent,
          timestamp: new Date().toISOString(),
          is_read: false,
          temp: true
        };
        
        // Добавляем временное сообщение в список
        setMessages(prevMessages => [...prevMessages, tempMsg]);
        
        // Отправляем через HTTP и получаем ответ
        const response = await chatService.sendMessageHttp(conversationId, messageContent);
        
        // Заменяем временное сообщение на настоящее
        if (response && response.id) {
          setMessages(prevMessages => {
            // Находим и удаляем временное сообщение
            const filteredMessages = prevMessages.filter(msg => 
              !(msg.temp && msg.content === messageContent && 
                msg.sender && user && 
                msg.sender.id === user.id)
            );
            
            // Создаем настоящее сообщение
            const realMsg = {
              id: response.id,
              conversation: parseInt(conversationId),
              sender: user,
              content: messageContent,
              timestamp: response.timestamp || new Date().toISOString(),
              is_read: false
            };
            
            // Добавляем настоящее сообщение
            return [...filteredMessages, realMsg];
          });
        }
      }
      
      // Прокручиваем к последнему сообщению
      scrollToBottom();
      
    } catch (err) {
      console.error('Ошибка при отправке сообщения:', err);
      setError('Не удалось отправить сообщение. Пожалуйста, попробуйте снова.');
      
      // Пытаемся отправить через HTTP как последнее средство
      try {
        const tempId = Date.now().toString() + "_retry";
        
        // Создаем временный объект сообщения для немедленного отображения
        const tempMsg = {
          id: tempId,
          conversation: parseInt(conversationId),
          sender: user,
          content: messageContent,
          timestamp: new Date().toISOString(),
          is_read: false,
          temp: true
        };
        
        // Добавляем временное сообщение для отображения
        setMessages(prevMessages => [...prevMessages, tempMsg]);
        
        // Отправляем сообщение через HTTP
        const response = await chatService.sendMessageHttp(conversationId, messageContent);
        
        // Обновляем диалог, чтобы получить актуальные данные
        const updatedConversation = await chatService.getConversation(conversationId);
        
        if (updatedConversation && updatedConversation.messages) {
          // Фильтруем временные сообщения перед установкой новых
          setMessages(prevMessages => {
            // Удаляем временные сообщения
            const filteredMessages = prevMessages.filter(msg => !msg.temp);
            
            // Добавляем актуальные сообщения без дублирования
            const newMessages = updatedConversation.messages.filter(newMsg => 
              !filteredMessages.some(existingMsg => existingMsg.id === newMsg.id)
            );
            
            return [...filteredMessages, ...newMessages];
          });
          
          setConversation(updatedConversation);
        }
      } catch (fallbackError) {
        console.error('Ошибка при отправке через HTTP:', fallbackError);
      }
    } finally {
      setIsSending(false);
    }
  };



  // Назад к списку диалогов
  const handleBackClick = () => {
    navigate('/conversations');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <p>Загрузка диалога {conversationId}...</p>
        {authTokens ? null : <p>Ошибка: Отсутствуют токены авторизации</p>}
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>{error}</p>
        <button 
          className="btn btn-primary mt-3" 
          onClick={() => navigate('/conversations')}
        >
          Вернуться к списку диалогов
        </button>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="error-container">
        <p>Диалог не найден или не загружен</p>
        <button 
          className="btn btn-primary mt-3" 
          onClick={() => navigate('/conversations')}
        >
          Вернуться к списку диалогов
        </button>
      </div>
    );
  }

  return (
    <div className="message-page">
      <div className="message-header">
        <button className="back-button" onClick={handleBackClick}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <div className="conversation-participant">
          {/* Получаем собеседника здесь напрямую */}
          {(() => {
            // Найти участника, который не является текущим пользователем
            const otherParticipant = conversation.participants.find(
              p => p.id !== (user?.id || user?.user_id) && p.username !== user?.username
            );
            
            // Если собеседник найден, используем его аватар и имя
            if (otherParticipant) {
              return (
                <>
                  <div 
                    className="participant-profile-link" 
                    onClick={() => navigate(`/seller/${otherParticipant.id}`)}
                    title="Перейти к профилю пользователя"
                  >
                    <img 
                      src={getUserAvatarUrl(otherParticipant)} 
                      alt={otherParticipant.username} 
                      className="avatar-img"
                      onError={handleAvatarError}
                    />
                    <span>{otherParticipant.username}</span>
                  </div>
                </>
              );
            }
            
            // Иначе показываем дефолтное изображение
            return (
              <>
                <img 
                  src="https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png" 
                  alt="Собеседник" 
                  className="avatar-img"
                  onError={handleAvatarError}
                />
                <span>Собеседник</span>
              </>
            );
          })()}
        </div>
        {conversation?.car && (
          <div className="conversation-info">
            {conversation.car.brand} {conversation.car.model}
          </div>
        )}
      </div>
      
      <div className="messages-container hide-scrollbar">
        {messages.length > 0 ? (
          messages.map((message, index) => {
            // Строго определяем отправителя сообщения
            let isOwnMessage = false;
            
            // Проверка по id пользователя
            if (user && message.sender && user.id === message.sender.id) {
              isOwnMessage = true;
            } 
            // Проверка по user_id пользователя
            else if (user && message.sender && user.user_id === message.sender.id) {
              isOwnMessage = true;
            }
            // Проверка по username
            else if (user && message.sender && user.username === message.sender.username) {
              isOwnMessage = true;
            }
            
            // Отладочное сообщение (убрано для чистоты консоли)
            
            // URL для аватара отправителя - напрямую из сообщения
            let avatarUrl = '';
            
            if (isOwnMessage) {
              // Мое сообщение - мой аватар
              avatarUrl = getUserAvatarUrl(user);
            } else {
              // Не мое сообщение - аватар отправителя или другого участника
              const otherParticipant = conversation.participants.find(
                p => p.id !== (user?.id || user?.user_id) && p.username !== user?.username
              );
              
              // Если нашли другого участника, используем его аватар
              if (otherParticipant) {
                avatarUrl = getUserAvatarUrl(otherParticipant);
              } 
              // Иначе пытаемся использовать данные из сообщения
              else if (message.sender) {
                avatarUrl = getUserAvatarUrl(message.sender);
              }
            }
            
            return (
              <div 
                key={index} 
                className={`message ${isOwnMessage ? 'own-message' : 'other-message'}`}
              >
                <div 
                  className="message-avatar"
                  onClick={() => {
                    if (!isOwnMessage && message.sender?.id) {
                      navigate(`/seller/${message.sender.id}`);
                    }
                  }}
                  style={!isOwnMessage ? { cursor: 'pointer' } : {}}
                  title={!isOwnMessage ? "Перейти к профилю пользователя" : ""}
                >
                  <img 
                    src={avatarUrl} 
                    alt={isOwnMessage ? 'Вы' : (message.sender?.username || 'Собеседник')} 
                    className="avatar-img-small"
                    onError={handleAvatarError}
                  />
                </div>
                <div className="message-content">
                  <div 
                    className={`message-sender ${!isOwnMessage ? 'clickable-sender' : ''}`}
                    onClick={() => {
                      if (!isOwnMessage && message.sender?.id) {
                        navigate(`/seller/${message.sender.id}`);
                      }
                    }}
                  >
                    {isOwnMessage ? 'Вы' : (message.sender?.username || getOtherParticipantName())}
                  </div>
                  <div className="message-text" style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>
                  <div className="message-time">
                    {new Date(message.timestamp).toLocaleTimeString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="no-messages">
            <p>Начните общение прямо сейчас!</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form className="message-form" onSubmit={handleSendMessage}>
        <div className="message-input-container">
          <textarea
            className="message-input"
            placeholder="Введите сообщение..."
            value={newMessage}
            rows="1"
            onChange={(e) => {
              setNewMessage(e.target.value);
              // Автоматически изменяем высоту при вводе текста
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
            }}
            onKeyDown={(e) => {
              // Enter отправляет сообщение, Shift+Enter - новая строка
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (newMessage.trim()) {
                  handleSendMessage(e);
                  // Сбрасываем высоту поля после отправки
                  e.target.style.height = 'auto';
                }
              }
            }}
          />
        </div>
        
        <button 
          type="submit" 
          className="send-button"
          disabled={!newMessage.trim()}
        >
          <i className="fas fa-paper-plane"></i>
        </button>
      </form>
    </div>
  );
};

export default MessagePage;