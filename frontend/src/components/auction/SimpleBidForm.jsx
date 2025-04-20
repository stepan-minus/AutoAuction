import React, { useState, useEffect, useCallback } from 'react';
import { formatCurrency } from '../../utils/formatDate';
import { getFullHeaders, API_URL } from '../../api/config';
import { useAuth } from '../../context/AuthContext';
import { placeBid as apiPlaceBid } from '../../api/auction';

/**
 * Упрощенная форма для размещения ставок
 * Улучшенная версия с исправленной обработкой ошибок
 */
const SimpleBidForm = ({ car, onBidPlaced }) => {
  const { user } = useAuth();
  const [bidAmount, setBidAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recommended, setRecommended] = useState(0);
  const [bidSuccess, setBidSuccess] = useState(false);

  // Устанавливаем рекомендуемую сумму ставки при изменении данных аукциона
  useEffect(() => {
    if (car && car.current_price) {
      const recommendedAmount = parseFloat(car.current_price) + parseFloat(car.min_bid_increment || 100);
      setRecommended(recommendedAmount);
      setBidAmount(recommendedAmount.toString());
    }
  }, [car]);

  // Обновляем рекомендуемую сумму при изменении текущей цены
  useEffect(() => {
    if (car && car.current_price) {
      const recommendedAmount = parseFloat(car.current_price) + parseFloat(car.min_bid_increment || 100);
      setRecommended(recommendedAmount);
      
      // Обновляем только если текущая ставка меньше рекомендуемой
      if (parseFloat(bidAmount) < recommendedAmount) {
        setBidAmount(recommendedAmount.toString());
      }
    }
  }, [car?.current_price, car?.min_bid_increment, bidAmount]);

  // При успешной ставке сбрасываем индикатор через 5 секунд
  useEffect(() => {
    if (bidSuccess) {
      const timer = setTimeout(() => {
        setBidSuccess(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [bidSuccess]);

  // Обработчик изменения поля ввода
  const handleBidChange = useCallback((e) => {
    setBidAmount(e.target.value);
    // Очищаем ошибку при вводе
    if (error) setError('');
  }, [error]);

  // Размещение ставки через обновленный API
  const placeBid = useCallback(async (carId, amount) => {
    console.log(`SimpleBidForm: Placing bid for car ${carId} with amount ${amount}`);
    
    try {
      // Используем API функцию для размещения ставки 
      // Она автоматически получит текущую цену и обновленный список ставок
      const result = await apiPlaceBid(carId, parseFloat(amount));
      console.log('SimpleBidForm: Bid placed successfully with result:', result);
      
      // Если API не вернул нужную структуру, создаем ее
      if (!result || typeof result !== 'object' || !result.id) {
        console.warn('SimpleBidForm: API returned incomplete data, creating enhanced response');
        
        // Создаем полный объект ставки с данными пользователя
        const enhancedResponse = {
          id: `bid-${Date.now()}`,
          car: carId,
          bidder: user ? {
            id: user.id,
            username: user.username
          } : { 
            id: 0,
            username: 'Неизвестный пользователь'
          },
          amount: parseFloat(amount),
          created_at: new Date().toISOString()
        };
        
        return enhancedResponse;
      }
      
      // Если к API добавил "updated_bids", мы оставляем это для родительского компонента
      return result;
    } catch (error) {
      console.error('SimpleBidForm: Error placing bid:', error);
      throw error;
    }
  }, [user]);

  // Обработчик отправки формы
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!car || !car.id) {
      setError('Некорректный аукцион');
      return;
    }
    
    if (!user) {
      setError('Для размещения ставки необходимо авторизоваться');
      return;
    }
    
    const amount = parseFloat(bidAmount);
    
    // Валидация суммы ставки
    if (isNaN(amount) || amount <= 0) {
      setError('Пожалуйста, введите корректную сумму ставки');
      return;
    }
    
    if (amount <= parseFloat(car.current_price)) {
      setError(`Ваша ставка должна быть выше текущей цены (${formatCurrency(car.current_price)})`);
      return;
    }
    
    const minIncrement = parseFloat(car.min_bid_increment || 100);
    const minRequired = parseFloat(car.current_price) + minIncrement;
    
    if (amount < minRequired) {
      setError(`Ваша ставка должна быть не менее ${formatCurrency(minRequired)} (текущая цена + ${formatCurrency(minIncrement)})`);
      return;
    }
    
    // Отправляем ставку
    setLoading(true);
    setError('');
    
    try {
      const result = await placeBid(car.id, amount);
      
      // Оповещаем родительский компонент
      if (onBidPlaced) {
        onBidPlaced(result);
      }
      
      // Показываем успешное сообщение
      setBidSuccess(true);
      
      // Обновляем рекомендуемую ставку для следующего раза
      const newRecommended = parseFloat(amount) + parseFloat(car.min_bid_increment || 100);
      setRecommended(newRecommended);
      setBidAmount(newRecommended.toString());
    } catch (err) {
      console.error('SimpleBidForm: Bid error:', err);
      
      // Обработка различных типов ошибок
      if (err.errorType) {
        // Обрабатываем ошибки с определенным типом, который мы задали в API
        switch(err.errorType) {
          case 'OWN_BID':
            setError('Вы не можете перебить свою собственную ставку');
            break;
          case 'OWN_AUCTION':
            setError('Вы не можете делать ставки на свой собственный аукцион');
            break;
          default:
            setError(err.message);
        }
      } else if (err.message) {
        // Проверяем типичные ошибки по сообщению
        if (err.message.includes('CSRF') || err.message.includes('csrf')) {
          setError('Ошибка безопасности. Пожалуйста, обновите страницу и попробуйте снова');
        } else if (err.message.toLowerCase().includes('собственную ставку') || err.message.toLowerCase().includes('own bid')) {
          setError('Вы не можете перебить свою собственную ставку');
        } else if (err.message.toLowerCase().includes('собственный аукцион') || err.message.toLowerCase().includes('own auction')) {
          setError('Вы не можете делать ставки на свой собственный аукцион');
        } else if (err.message.includes('Unauthorized') || err.message.includes('авторизации')) {
          setError('Необходимо авторизоваться. Пожалуйста, войдите в систему');
        } else if (err.message.includes('network') || err.message.includes('соединение')) {
          setError('Ошибка сети. Проверьте подключение к интернету');
        } else {
          // Если все же сообщение содержит текст о своей ставке, но не было определено выше
          if (err.message.toLowerCase().includes('ставк') && err.message.toLowerCase().includes('сво')) {
            setError('Вы не можете перебить свою собственную ставку');
          } else {
            setError(err.message);
          }
        }
      } else {
        setError('Не удалось разместить ставку. Пожалуйста, попробуйте позже');
      }
    } finally {
      setLoading(false);
    }
  }, [car, bidAmount, placeBid, onBidPlaced, user]);
  
  // Не показываем форму, если аукцион не активен
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
          <span className="price-value">{formatCurrency(car.min_bid_increment || 100)}</span>
        </div>
      </div>
      
      {bidSuccess && (
        <div className="bid-success">
          Ваша ставка в размере {formatCurrency(parseFloat(bidAmount) - parseFloat(car.min_bid_increment || 100))} успешно размещена!
        </div>
      )}
      
      {error && <div className="bid-error">{error}</div>}
      
      <form onSubmit={handleSubmit} className="bid-form">
        <div className="input-group">
          <label htmlFor="bidAmount">Ваша ставка (₽)</label>
          <div className="bid-input-wrapper">
            <input
              type="number"
              id="bidAmount"
              className="bid-input"
              min={recommended}
              step="1"
              value={bidAmount}
              onChange={handleBidChange}
              disabled={loading}
              required
            />
          </div>
        </div>
        
        <button 
          type="submit" 
          className="submit-bid-button" 
          disabled={loading}
        >
          {loading ? 'Размещение ставки...' : 'Сделать ставку'}
        </button>
      </form>
    </div>
  );
};

export default SimpleBidForm;