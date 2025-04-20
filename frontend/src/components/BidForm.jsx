import React, { useState, useEffect } from 'react';
import { placeBid } from '../api/auction';
import { formatCurrency } from '../utils/formatDate';

const BidForm = ({ car, onBidPlaced, error, setError }) => {
  const [bidAmount, setBidAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommended, setRecommended] = useState(0);
  
  useEffect(() => {
    if (car) {
      // Set recommended bid amount (current price + min increment)
      const recommendedAmount = parseFloat(car.current_price) + parseFloat(car.min_bid_increment);
      setRecommended(recommendedAmount);
      setBidAmount(recommendedAmount.toString());
    }
  }, [car]);
  
  // Update bid to minimum when current price changes
  useEffect(() => {
    if (car) {
      const recommendedAmount = parseFloat(car.current_price) + parseFloat(car.min_bid_increment);
      setRecommended(recommendedAmount);
      
      // Only update the bid amount if it's less than the new minimum
      if (parseFloat(bidAmount) < recommendedAmount) {
        setBidAmount(recommendedAmount.toString());
      }
    }
  }, [car?.current_price, car?.min_bid_increment]);
  
  const handleBidChange = (e) => {
    setBidAmount(e.target.value);
    // Clear any previous errors when user starts typing
    if (error) setError('');
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!car || !car.id) {
      setError('Некорректный аукцион');
      return;
    }
    
    const amount = parseFloat(bidAmount);
    
    // Validate bid amount
    if (isNaN(amount) || amount <= 0) {
      setError('Пожалуйста, введите корректную сумму ставки');
      return;
    }
    
    if (amount <= parseFloat(car.current_price)) {
      setError(`Ваша ставка должна быть выше текущей цены (${formatCurrency(car.current_price)})`);
      return;
    }
    
    const minIncrement = parseFloat(car.min_bid_increment);
    const minRequired = parseFloat(car.current_price) + minIncrement;
    
    if (amount < minRequired) {
      setError(`Ваша ставка должна быть не менее ${formatCurrency(minRequired)} (текущая цена + ${formatCurrency(minIncrement)})`);
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      console.log(`Placing bid on car ID ${car.id} with amount ${amount}`);
      const result = await placeBid(car.id, amount);
      console.log('Bid placed successfully:', result);
      
      // Clear form and notify parent component
      setBidAmount(''); 
      onBidPlaced(result);
      
      // Update recommended amount for next bid
      const newRecommended = parseFloat(amount) + parseFloat(car.min_bid_increment);
      setRecommended(newRecommended);
      setBidAmount(newRecommended.toString());
    } catch (err) {
      console.error('Bid error:', err);
      
      // Улучшенная обработка ошибок с фокусом на возможных проблемах WebSocket
      if (err && err.message) {
        // Обработка ошибок WebSocket и связи
        if (err.message.includes('WebSocket') || 
            err.message.includes('соединение') || 
            err.message.includes('connection')) {
          setError('Проблема с соединением WebSocket. Пожалуйста, обновите страницу и попробуйте снова.');
        } 
        // Проверяем типичные ошибки, связанные с CSRF
        else if (err.message.includes('CSRF') || err.message.includes('csrf')) {
          setError('Ошибка безопасности CSRF. Пожалуйста, обновите страницу и попробуйте снова.');
        } 
        // Ошибки сети
        else if (err.message.includes('Network Error') || err.message.includes('network')) {
          setError('Ошибка сети. Проверьте ваше соединение и попробуйте снова.');
        } 
        // Ошибки доступа 
        else if (err.message.includes('status code 403') || err.message.includes('Forbidden')) {
          setError('Доступ запрещен. Возможно, вам нужно заново войти в систему.');
        } 
        // Ошибки авторизации
        else if (err.message.includes('status code 401') || err.message.includes('Unauthorized')) {
          setError('Необходима авторизация. Пожалуйста, войдите в систему снова.');
        }
        // Ошибки конкретных бизнес-правил
        else if (err.message.includes('не можете делать ставки на свой собственный аукцион')) {
          setError('Вы не можете делать ставки на свой собственный аукцион.');
        }
        else if (err.message.includes('не можете перебить свою собственную ставку')) {
          setError('Вы не можете перебить свою собственную ставку.');
        }
        else if (err.message.includes('This auction is not active')) {
          setError('Этот аукцион больше не активен.');
        }
        else {
          // Проверяем, есть ли конкретное сообщение об ошибке от сервера
          if (err.response && err.response.data) {
            if (err.response.data.error) {
              // Ошибка от сервера в формате { error: "сообщение" }
              setError(err.response.data.error);
            } else if (err.response.data.detail) {
              // Ошибка от Django Rest Framework в формате { detail: "сообщение" }
              setError(err.response.data.detail);
            } else if (typeof err.response.data === 'string') {
              // Ошибка как строка
              setError(err.response.data);
            } else {
              // Стандартная ошибка JavaScript с сообщением
              setError(err.message);
            }
          } else {
            // Стандартная ошибка JavaScript с сообщением
            setError(err.message);
          }
        }
      } else {
        // Неизвестная ошибка
        setError('Не удалось разместить ставку. Пожалуйста, обновите страницу и попробуйте еще раз.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Don't show form if auction is not active
  if (!car || car.status !== 'active' || car.time_remaining <= 0) {
    return (
      <div className="bid-form-inactive">
        <p className="auction-not-active">Этот аукцион в данный момент не принимает ставки</p>
      </div>
    );
  }
  
  return (
    <div className="bid-form-container">
      <h3>Сделать ставку</h3>
      
      <div className="current-info">
        <div className="current-price">
          <span className="price-label">Текущая цена:</span> 
          <span className="price-value">{formatCurrency(car.current_price)}</span>
        </div>
        <div className="min-increment">
          <span className="price-label">Минимальный шаг:</span> 
          <span className="price-value">{formatCurrency(car.min_bid_increment)}</span>
        </div>
      </div>
      
      {error && <div className="bid-error">{error}</div>}
      
      <form onSubmit={handleSubmit} className="bid-form">
        <div className="input-group">
          <label htmlFor="bidAmount">Ваша ставка (₽)</label>
          <input
            type="number"
            id="bidAmount"
            min={recommended}
            step="1"
            value={bidAmount}
            onChange={handleBidChange}
            disabled={loading}
            required
          />
        </div>
        
        <button 
          type="submit" 
          className="submit-button" 
          disabled={loading}
        >
          {loading ? 'Размещение ставки...' : 'Сделать ставку'}
        </button>
      </form>
    </div>
  );
};

export default BidForm;
