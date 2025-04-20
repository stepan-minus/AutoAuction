import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import chatService from '../services/chatService';
import { getUserAvatarUrl, handleAvatarError } from '../utils/avatarHelper';

const ConversationsPage = () => {
  const { user, authTokens } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Функция для получения списка диалогов
  useEffect(() => {
    const fetchConversations = async () => {
      if (!authTokens?.access) {
        console.log('Нет токена доступа для загрузки диалогов');
        return;
      }
      
      try {
        setLoading(true);
        console.log(`Загрузка диалогов с токеном: ${authTokens.access.substring(0, 10)}...`);
        
        // Используем chatService вместо прямых axios запросов
        const response = await chatService.getConversations();
        
        console.log('Получены диалоги:', response);
        
        // Дополнительная проверка что response это массив
        if (Array.isArray(response)) {
          setConversations(response);
          setError(null); // Сбрасываем ошибку, если она была
        } else {
          console.warn('Получены данные в неправильном формате:', response);
          setConversations([]);
          setError('Данные в неправильном формате. Попробуйте обновить страницу.');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Ошибка при загрузке диалогов:', err);
        
        if (retryCount < 3) {
          console.log(`Повторная попытка ${retryCount + 1}/3 загрузки диалогов...`);
          setRetryCount(prevCount => prevCount + 1);
          
          // Увеличиваем время ожидания с каждой попыткой (1s, 2s, 4s)
          const retryDelay = Math.pow(2, retryCount) * 1000;
          console.log(`Следующая попытка через ${retryDelay/1000} секунд`);
          
          // Не запускаем setTimeout, если компонент будет размонтирован
          // Используем возврат из useEffect
          return;
        } else {
          // Формируем более понятное сообщение об ошибке
          let errorMessage = 'Не удалось загрузить диалоги. Пожалуйста, попробуйте позже.';
          
          // Если ошибка от API, показываем её
          if (err.response) {
            if (err.response.status === 401 || err.response.status === 403) {
              errorMessage = 'Ошибка авторизации. Пожалуйста, войдите в систему снова.';
            } else if (err.response.status === 404) {
              errorMessage = 'Диалоги не найдены.';
            } else if (err.response.data && err.response.data.detail) {
              errorMessage = `Ошибка: ${err.response.data.detail}`;
            }
          } else if (err.message) {
            errorMessage = `Ошибка: ${err.message}`;
          }
          
          setError(errorMessage);
          setLoading(false);
        }
      }
    };

    if (authTokens?.access) {
      fetchConversations();
      
      // Если retryCount > 0, запускаем таймер для повторной попытки
      let retryTimer = null;
      if (retryCount > 0 && retryCount <= 3) {
        const retryDelay = Math.pow(2, retryCount - 1) * 1000;
        console.log(`Таймер на повторную попытку: ${retryDelay/1000} секунд`);
        retryTimer = setTimeout(fetchConversations, retryDelay);
      }
      
      // Очищаем таймер при размонтировании
      return () => {
        if (retryTimer) {
          clearTimeout(retryTimer);
        }
      };
    } else {
      console.log('Нет токена авторизации для загрузки диалогов');
      setLoading(false);
    }
  }, [authTokens, retryCount]);

  // Открыть диалог при клике
  const handleConversationClick = (conversationId) => {
    navigate(`/messages/${conversationId}`);
  };

  // Получить другого участника диалога (не текущего пользователя)
  const getOtherParticipant = (conversation) => {
    if (!user || !conversation || !conversation.participants) {
      return null;
    }
    
    // Надежный способ поиска другого участника
    // Текущий пользователь может иметь либо id, либо user_id в зависимости от контекста
    const currentUserId = user.user_id || user.id;
    const currentUsername = user.username;
    
    // Находим и проверяем всеми возможными способами
    const otherParticipant = conversation.participants.find(p => {
      // Проверяем по ID и по имени пользователя
      return (p.id !== currentUserId) && (p.username !== currentUsername);
    });
    
    if (!otherParticipant) {
      console.log('Не удалось найти другого участника в диалоге:', conversation);
      return null;
    }
    
    return otherParticipant;
  };
  
  // Получить имя собеседника (не текущего пользователя)
  const getOtherParticipantName = (conversation) => {
    const otherParticipant = getOtherParticipant(conversation);
    if (!otherParticipant) {
      return 'Пользователь';
    }
    
    // Проверяем корректность данных собеседника
    const displayName = otherParticipant.username || 'Пользователь';
    return displayName;
  };
  
  // Получить аватар собеседника
  const getOtherParticipantAvatar = (conversation) => {
    const otherParticipant = getOtherParticipant(conversation);
    if (!otherParticipant) {
      return 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png';
    }
    
    return getUserAvatarUrl(otherParticipant);
  };
  
  // Переход к профилю пользователя
  const navigateToUserProfile = (e, conversation) => {
    e.stopPropagation(); // Останавливаем всплытие события, чтобы не активировать родительский onClick
    
    const otherParticipant = getOtherParticipant(conversation);
    if (otherParticipant && otherParticipant.id) {
      navigate(`/seller/${otherParticipant.id}`);
    }
  };

  if (loading) {
    return <div className="loading-container">Загрузка диалогов...</div>;
  }

  if (error) {
    return <div className="error-container">{error}</div>;
  }

  return (
    <div className="conversations-page">
      <div className="conversations-header">
        <h1>Мои диалоги</h1>
      </div>
      
      <div className="conversations-list">
        {conversations.length > 0 ? (
          conversations.map(conversation => (
            <div 
              key={conversation.id} 
              className="conversation-item"
              onClick={() => handleConversationClick(conversation.id)}
            >
              <div 
                className="conversation-avatar"
                onClick={(e) => navigateToUserProfile(e, conversation)}
                title="Перейти к профилю пользователя"
              >
                <img 
                  src={getOtherParticipantAvatar(conversation)} 
                  alt={getOtherParticipantName(conversation)} 
                  className="avatar-img"
                  onError={handleAvatarError}
                />
              </div>
              <div className="conversation-details">
                <div 
                  className="conversation-name clickable-user-name"
                  onClick={(e) => navigateToUserProfile(e, conversation)}
                  title="Перейти к профилю пользователя"
                >
                  {getOtherParticipantName(conversation)}
                </div>
                <div className="conversation-car">
                  {conversation.car && conversation.car.brand && conversation.car.model && 
                   conversation.car.brand !== 'undefined' && conversation.car.model !== 'undefined' ? 
                   `${conversation.car.brand} ${conversation.car.model}` : 'Обсуждение'}
                </div>
                {conversation.last_message && (
                  <div className="conversation-last-message">
                    {conversation.last_message.content.length > 50
                      ? `${conversation.last_message.content.substring(0, 50)}...`
                      : conversation.last_message.content}
                  </div>
                )}
              </div>
              <div className="conversation-time">
                {conversation.updated_at && new Date(conversation.updated_at).toLocaleString('ru-RU', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  day: 'numeric',
                  month: 'short'
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="no-conversations">
            <p>У вас еще нет диалогов.</p>
            <Link to="/" className="nfs-button">Просмотреть аукционы</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationsPage;