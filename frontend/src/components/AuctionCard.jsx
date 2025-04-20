import React from 'react';
import { Link } from 'react-router-dom';
import Timer from './Timer';
import { formatCurrency } from '../utils/formatDate';

const AuctionCard = ({ car }) => {
  const {
    id,
    brand,
    model,
    year,
    current_price,
    status,
    end_time,
    bid_count,
    time_remaining,
    tags,
    image,
    image_url
  } = car;

  // Обработка URL изображения
  let carImage = 'https://via.placeholder.com/300x200?text=No+Image';
  
  if (image_url) {
    // Если URL относительный, используем его как есть
    if (image_url.startsWith('/')) {
      carImage = image_url;
    } 
    // Если URL содержит 0.0.0.0, преобразуем в относительный путь
    else if (image_url.includes('0.0.0.0')) {
      // Извлекаем путь после '/media/'
      const mediaPath = image_url.split('/media/')[1];
      if (mediaPath) {
        carImage = `/media/${mediaPath}`;
      }
    }
    // Иначе используем как есть
    else {
      carImage = image_url;
    }
  }
  
  // Status display styling
  const getStatusClass = (status) => {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'pending':
        return 'status-pending';
      case 'completed':
        return 'status-completed';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return '';
    }
  };

  // Format status for display
  const formatStatus = (status) => {
    switch (status) {
      case 'active':
        return 'Активный';
      case 'pending':
        return 'Ожидание';
      case 'completed':
        return 'Завершен';
      case 'cancelled':
        return 'Отменен';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  // Если аукцион в статусе "pending" и есть поле start_time, рассчитываем время до начала
  const calculateTimeUntilStart = () => {
    if (status === 'pending' && car.start_time) {
      return Math.max(0, Math.floor((new Date(car.start_time) - new Date()) / 1000));
    }
    return 0;
  };
  
  const timeUntilStart = calculateTimeUntilStart();
  
  return (
    <div className="auction-card">
      <Link to={`/auction/${id}`} className="auction-card-link">
        <div className="card-image">
          <img src={carImage} alt={`${brand} ${model}`} />
          <span className={`status-badge ${getStatusClass(status)}`}>
            {formatStatus(status)}
          </span>
        </div>
        
        <div className="card-content">
          <h3 className="car-title">{brand} {model} ({year})</h3>
          
          <div className="price-section">
            <span className="current-price">{formatCurrency(current_price)}</span>
            <span className="bid-count">{bid_count} ставк{bid_count === 1 ? 'а' : bid_count >= 2 && bid_count <= 4 ? 'и' : 'ок'}</span>
          </div>
          
          {tags && tags.length > 0 && (
            <div className="tags-container">
              {tags.map(tag => (
                <span key={tag.id} className="tag">{tag.name}</span>
              ))}
            </div>
          )}
          
          {status === 'active' && time_remaining > 0 && (
            <div className="timer-container">
              <Timer endTime={end_time} timeRemaining={time_remaining} />
            </div>
          )}
          
          {status === 'pending' && car.start_time && timeUntilStart > 0 && (
            <div className="timer-container pending-timer-card">
              <Timer endTime={car.start_time} timeRemaining={timeUntilStart} />
              <span className="pending-message">до начала аукциона</span>
            </div>
          )}
          
          {status === 'completed' && (
            <div className="auction-ended">
              Аукцион завершен
            </div>
          )}
        </div>
      </Link>
    </div>
  );
};

export default AuctionCard;
