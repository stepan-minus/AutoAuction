import React, { useState } from 'react';
import { Toast, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

const NotificationToast = ({ 
  id, 
  title, 
  message, 
  type, 
  onClose, 
  link, 
  linkText,
  chatId,
  auctionId,
  notificationType,
  carId,
  carBrand,
  carModel,
  newBidAmount,
  conversation_id
}) => {
  const [show, setShow] = useState(true);
  const navigate = useNavigate();

  const handleClose = () => {
    setShow(false);
    if (onClose) {
      onClose(id);
    }
  };

  const getBgClass = () => {
    switch (type) {
      case 'success':
        return 'bg-success';
      case 'warning':
        return 'bg-warning';
      case 'danger':
        return 'bg-danger';
      case 'info':
        return 'bg-info';
      case 'outbid':
        return 'bg-danger';
      case 'auction_won':
        return 'bg-success';
      case 'auction_ended':
        return 'bg-info';
      default:
        return 'bg-secondary';
    }
  };

  const handleChatAction = () => {
    if (conversation_id) {
      navigate(`/messages/${conversation_id}`);
    } else if (chatId) {
      navigate(`/messages/${chatId}`);
    } else if (auctionId) {
      // Если чат ещё не создан, открываем страницу аукциона
      navigate(`/auction/${auctionId}`);
    } else if (carId) {
      navigate(`/auction/${carId}`);
    }
  };

  const handleNewBid = () => {
    if (carId) {
      navigate(`/auction/${carId}`);
    }
  };

  // Генерируем заголовок и сообщение на основе типа уведомления
  const getNotificationContent = () => {
    let notificationTitle = title;
    let notificationMessage = message;
    let buttons = [];
    
    // Если это предопределенный тип уведомления, формируем контент
    if (notificationType === 'outbid') {
      notificationTitle = "Ваша ставка перебита!";
      notificationMessage = `Ваша ставка на ${carBrand} ${carModel} была перебита. Новая цена: ${newBidAmount} ₽`;
      buttons.push(
        <Button 
          key="newbid" 
          variant="primary" 
          size="sm" 
          onClick={handleNewBid}
          className="mt-1 me-2 w-100"
        >
          <i className="fas fa-gavel me-1"></i> Сделать новую ставку
        </Button>
      );
    } else if (notificationType === 'auction_won') {
      notificationTitle = "Поздравляем! Вы выиграли аукцион";
      notificationMessage = `Вы выиграли аукцион на ${carBrand} ${carModel} с финальной ставкой ${newBidAmount} ₽`;
      // Только кнопка для чата, без кнопки для новой ставки
      buttons.push(
        <Button 
          key="chat" 
          variant="success" 
          size="sm" 
          onClick={handleChatAction}
          className="mt-1 w-100"
        >
          <i className="fas fa-comments me-1"></i> Перейти в чат с продавцом
        </Button>
      );
    } else if (notificationType === 'auction_ended') {
      notificationTitle = "Аукцион завершен";
      notificationMessage = message || `Ваш аукцион на ${carBrand} ${carModel} завершен.`;
      
      if (conversation_id) {
        buttons.push(
          <Button 
            key="chat" 
            variant="primary" 
            size="sm" 
            onClick={handleChatAction}
            className="mt-1 w-100"
          >
            <i className="fas fa-comments me-1"></i> Перейти в чат с победителем
          </Button>
        );
      }
    }
    
    return { 
      title: notificationTitle, 
      message: notificationMessage,
      buttons: buttons
    };
  };

  const { title: displayTitle, message: displayMessage, buttons } = getNotificationContent();

  return (
    <Toast 
      show={show} 
      onClose={handleClose} 
      className={`notification-toast ${type}`}
      delay={10000}
      autohide
    >
      <Toast.Header className={getBgClass() + ' text-white'}>
        <strong className="me-auto">{displayTitle}</strong>
      </Toast.Header>
      <Toast.Body className="notification-body">
        <p className="notification-message">{displayMessage}</p>
        
        <div className="notification-buttons">
          {/* Отображаем сгенерированные кнопки если есть */}
          {buttons && buttons.length > 0 && buttons}
          
          {/* Стандартная кнопка для перехода по ссылке */}
          {linkText && link && !notificationType && (
            <Link to={link} className="btn btn-sm btn-outline-primary">
              {linkText}
            </Link>
          )}
          
          {/* Стандартная кнопка для перехода в чат */}
          {(chatId || auctionId) && !notificationType && (
            <Button 
              variant="outline-primary" 
              size="sm" 
              onClick={handleChatAction}
              className="mt-1"
            >
              Перейти в чат
            </Button>
          )}
        </div>
      </Toast.Body>
    </Toast>
  );
};

export default NotificationToast;