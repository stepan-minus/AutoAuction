import React from 'react';
import { Badge, ListGroup, Spinner, Image } from 'react-bootstrap';
import { formatDateTime } from '../../utils/dateUtils';
import { useAuth } from '../../context/AuthContext';

const ConversationList = ({ conversations, onSelectConversation, selectedId, loading }) => {
  const { user } = useAuth();
  
  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" />
        <p>Загрузка диалогов...</p>
      </div>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="text-center my-5">
        <p>У вас пока нет диалогов</p>
        <p className="small text-muted">Начните диалог с продавцом на странице аукциона</p>
      </div>
    );
  }

  return (
    <ListGroup className="conversation-list">
      {conversations.map((conversation) => {
        // Фильтрация собеседников (исключаем текущего пользователя)
        const otherParticipant = conversation.participants
          .find(participant => participant.id !== user.id);
        
        const isSelected = selectedId === conversation.id;
        
        // Определяем заголовок диалога (сначала имя пользователя)
        let username = otherParticipant ? otherParticipant.username : 'Пользователь';
        
        // Информация об автомобиле (если есть)
        let carInfo = '';
        if (conversation.car && 
            conversation.car.brand && 
            conversation.car.model && 
            conversation.car.brand !== 'undefined' && 
            conversation.car.model !== 'undefined') {
          carInfo = `${conversation.car.brand} ${conversation.car.model}`;
        }

        return (
          <ListGroup.Item 
            key={conversation.id}
            className={`conversation-item ${isSelected ? 'active' : ''}`}
            action
            onClick={() => onSelectConversation(conversation.id)}
          >
            {/* Аватар собеседника */}
            <div className="conversation-avatar">
              {otherParticipant?.profile?.avatar_url ? (
                <Image 
                  src={otherParticipant.profile.avatar_url} 
                  roundedCircle 
                  className="avatar-image" 
                  alt={`Аватар ${username}`} 
                />
              ) : (
                <div className="avatar-placeholder">
                  {username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            
            <div className="conversation-info">
              <div className="conversation-header">
                <div className="conversation-username">
                  {username}
                </div>
                <div className="conversation-time">
                  {conversation.last_message 
                    ? formatDateTime(conversation.last_message.timestamp) 
                    : formatDateTime(conversation.created_at)}
                </div>
              </div>
              
              {carInfo && (
                <div className="conversation-car-info">
                  {carInfo}
                </div>
              )}
              
              {conversation.last_message && (
                <div className="conversation-preview">
                  {conversation.last_message.content && conversation.last_message.content.length > 30 
                    ? `${conversation.last_message.content.substring(0, 30)}...` 
                    : conversation.last_message.content || 'Нет сообщений'}
                </div>
              )}
            </div>
            
            {conversation.unread_count > 0 && (
              <Badge className="unread-badge" pill bg="danger">
                {conversation.unread_count}
              </Badge>
            )}
          </ListGroup.Item>
        );
      })}
    </ListGroup>
  );
};

export default ConversationList;