import React from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency, formatDate } from '../../utils/formatDate';
import Timer from '../Timer';

/**
 * Компонент карточки аукциона для профиля пользователя
 */
const ProfileAuctionCard = ({ car, onDelete }) => {
  // Обработка URL изображения
  let carImage = 'https://via.placeholder.com/300x200?text=No+Image';
  
  if (car.image_url) {
    // Если URL относительный, используем его как есть
    if (car.image_url.startsWith('/')) {
      carImage = car.image_url;
    } 
    // Если URL содержит 0.0.0.0, преобразуем в относительный путь
    else if (car.image_url.includes('0.0.0.0')) {
      // Извлекаем путь после '/media/'
      const mediaPath = car.image_url.split('/media/')[1];
      if (mediaPath) {
        carImage = `/media/${mediaPath}`;
      }
    }
    // Иначе используем как есть
    else {
      carImage = car.image_url;
    }
  } else if (car.image) {
    // Аналогичная логика для поля image
    if (car.image.includes && car.image.includes('0.0.0.0')) {
      const mediaPath = car.image.split('/media/')[1];
      if (mediaPath) {
        carImage = `/media/${mediaPath}`;
      }
    } else {
      carImage = car.image;
    }
  }

  // Для отображения статуса
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'active':
        return 'status-badge-active';
      case 'pending':
        return 'status-badge-pending';
      case 'completed':
        return 'status-badge-completed';
      case 'cancelled':
        return 'status-badge-cancelled';
      default:
        return 'status-badge-default';
    }
  };

  const formatStatus = (status) => {
    switch (status) {
      case 'active':
        return 'Активен';
      case 'pending':
        return 'Ожидает';
      case 'completed':
        return 'Завершен';
      case 'cancelled':
        return 'Отменен';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  // Рассчитываем оставшееся время для активных аукционов
  const timeRemaining = car.time_remaining || 
    (car.end_time ? Math.max(0, Math.floor((new Date(car.end_time) - new Date()) / 1000)) : 0);

  return (
    <div className="auction-card profile-auction-card">
      <Link to={`/auction/${car.id}`} className="auction-card-link">
        <div className="card-image">
          <img src={carImage} alt={`${car.brand} ${car.model}`} />
          <span className={`status-badge ${getStatusBadgeClass(car.status)}`}>
            {formatStatus(car.status)}
          </span>
        </div>
        
        <div className="card-content">
          <h3 className="car-title">{car.brand} {car.model} ({car.year})</h3>
          
          <div className="price-section">
            <span className="current-price">{formatCurrency(car.current_price)}</span>
            <span className="bid-count">
              {car.bid_count || 0} ставк{car.bid_count === 1 ? 'а' : car.bid_count >= 2 && car.bid_count <= 4 ? 'и' : 'ок'}
            </span>
          </div>
          
          {car.status === 'active' && timeRemaining > 0 && (
            <div className="timer-container">
              <Timer endTime={car.end_time} timeRemaining={timeRemaining} />
            </div>
          )}
          
          {car.status === 'pending' && (
            <div className="pending-message">
              Ожидает публикации
            </div>
          )}
        </div>
      </Link>
      
      {car.status === 'pending' && (
        <button onClick={() => onDelete(car)} className="delete-button">
          <i className="fas fa-trash"></i> Удалить
        </button>
      )}
    </div>
  );
};

export default ProfileAuctionCard;