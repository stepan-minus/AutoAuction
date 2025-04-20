import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getCarDetails, getCarBids, getCurrentPrice } from '../api/auction';
import { useAuth } from '../context/AuthContext';
import Timer from '../components/Timer';
import Loader from '../components/Loader';
import ImageGallery from '../components/ImageGallery';
import StartChatButton from '../components/chat/StartChatButton';

// Новые упрощенные компоненты для ставок
import SimpleBidForm from '../components/auction/SimpleBidForm';
import RealtimeBidDisplay from '../components/auction/RealtimeBidDisplay';

import { formatCurrency, formatDate } from '../utils/formatDate';
import AuthRequiredError from '../components/auth/AuthRequiredError';

const AuctionPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [car, setCar] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthError, setIsAuthError] = useState(false);
  const [bidError, setBidError] = useState('');
  const [bidListFunctions, setBidListFunctions] = useState(null);
  
  // Загрузка информации об автомобиле
  const loadCarDetails = useCallback(async () => {
    try {
      console.log('AuctionPage: Loading car details for ID', id);
      setLoading(true);
      
      // Загружаем детали автомобиля
      const carData = await getCarDetails(id);
      console.log('AuctionPage: Car details loaded successfully', carData);
      
      // Обновляем текущую цену отдельным запросом для гарантии актуальности
      try {
        const currentPrice = await getCurrentPrice(id);
        console.log('AuctionPage: Current price fetched separately:', currentPrice);
        // Если цена получена, обновляем её в данных автомобиля
        if (currentPrice) {
          carData.current_price = currentPrice;
        }
      } catch (priceErr) {
        console.warn('AuctionPage: Failed to fetch current price separately:', priceErr);
        // Продолжаем с ценой из carData в случае ошибки
      }
      
      // Устанавливаем данные автомобиля в state
      setCar(carData);
      
      // Всегда загружаем ставки отдельным запросом для гарантии актуальности
      try {
        console.log('AuctionPage: Loading bids separately for car ID', id);
        const bidsData = await getCarBids(id);
        console.log('AuctionPage: Bids loaded successfully, count:', bidsData.length);
        
        // Преобразуем структуру ставок при необходимости
        const formattedBids = bidsData.map(bid => {
          // Проверяем наличие правильной структуры bidder
          if (!bid.bidder || !bid.bidder.username) {
            return {
              ...bid,
              bidder: {
                id: bid.bidder?.id || 0,
                username: bid.bidder_name || bid.bidder || 'Неизвестный'
              }
            };
          }
          return bid;
        });
        
        // Сортируем ставки по сумме и времени
        const sortedBids = formattedBids.sort((a, b) => {
          // По сумме (убывание)
          if (parseFloat(a.amount) !== parseFloat(b.amount)) {
            return parseFloat(b.amount) - parseFloat(a.amount);
          }
          // По времени (сначала новые)
          return new Date(b.created_at) - new Date(a.created_at);
        });
        
        console.log('AuctionPage: Setting formatted and sorted bids in state');
        setBids(sortedBids);
      } catch (bidErr) {
        console.error('AuctionPage: Error loading bids:', bidErr);
        // Если не удалось загрузить ставки, не показываем ошибку пользователю,
        // просто оставляем список ставок пустым или используем те, что есть в carData
        if (carData.bids && Array.isArray(carData.bids) && carData.bids.length > 0) {
          console.log('AuctionPage: Using bids from car data as fallback');
          const fallbackBids = carData.bids.map(bid => {
            if (!bid.bidder || !bid.bidder.username) {
              return {
                ...bid,
                bidder: {
                  id: bid.bidder?.id || 0,
                  username: bid.bidder_name || bid.bidder || 'Неизвестный'
                }
              };
            }
            return bid;
          });
          setBids(fallbackBids);
        } else {
          setBids([]);
        }
      }
    } catch (err) {
      console.error('AuctionPage: Error loading car details:', err);
      
      // Проверяем, связана ли ошибка с авторизацией (401)
      if (err.message && (
          err.message.includes('Unauthorized') || 
          err.message.includes('Authentication') || 
          err.message.includes('не авторизован') ||
          err.message.includes('401') ||
          err.response?.status === 401)) {
        console.log('AuctionPage: Authentication error detected');
        setIsAuthError(true);
        setError('Требуется авторизация для просмотра данного аукциона');
      } else {
        setError('Не удалось загрузить информацию об аукционе. Пожалуйста, попробуйте еще раз.');
      }
    } finally {
      console.log('AuctionPage: Car and bids loading completed');
      setLoading(false);
    }
  }, [id]);
  
  // Загружаем данные при первом рендере
  useEffect(() => {
    loadCarDetails();
    
    // Настраиваем автоматическое обновление данных каждые 30 секунд
    // чтобы всегда отображались актуальные ставки и цена
    const autoRefreshInterval = setInterval(() => {
      console.log('AuctionPage: Auto-refreshing auction data');
      loadCarDetails();
    }, 30000); // 30 секунд
    
    // Очищаем интервал при размонтировании компонента
    return () => {
      clearInterval(autoRefreshInterval);
    };
  }, [loadCarDetails]);
  
  // Обрабатываем успешное размещение ставки
  const handleBidPlaced = useCallback((newBid) => {
    if (!newBid) return;
    
    console.log('AuctionPage: Bid placed successfully:', newBid);
    
    // Обновляем цену автомобиля
    setCar(prevCar => {
      if (!prevCar) return null;
      return {
        ...prevCar,
        current_price: newBid.amount
      };
    });
    
    // Добавляем ставку в список через компонент RealtimeBidDisplay
    if (bidListFunctions && bidListFunctions.addNewBid) {
      console.log('AuctionPage: Adding new bid through bidListFunctions');
      bidListFunctions.addNewBid(newBid);
    } else {
      // Запасной вариант - добавляем напрямую в локальный стейт
      console.log('AuctionPage: No bidListFunctions available, adding bid directly');
      setBids(prevBids => {
        // Создаем копию текущих ставок
        const updatedBids = [...prevBids];
        
        // Проверяем, есть ли уже такая ставка
        const existingIndex = updatedBids.findIndex(bid => bid.id === newBid.id);
        
        if (existingIndex >= 0) {
          // Если ставка существует, заменяем её
          updatedBids[existingIndex] = newBid;
        } else {
          // Иначе добавляем новую ставку
          updatedBids.push(newBid);
        }
        
        // Сортируем ставки
        return updatedBids.sort((a, b) => {
          if (parseFloat(a.amount) !== parseFloat(b.amount)) {
            return parseFloat(b.amount) - parseFloat(a.amount);
          }
          return new Date(b.created_at) - new Date(a.created_at);
        });
      });
    }
    
    // Сбрасываем ошибки
    setBidError('');
  }, [bidListFunctions]);
  
  // Функция для взаимодействия с компонентом ставок
  
  // Функция обновления цены и экспорта функций компонента ставок
  const handleBidsUpdate = useCallback((newPrice, newBid) => {
    console.log('AuctionPage: handleBidsUpdate called with newPrice:', newPrice);
    
    // Обновляем текущую цену автомобиля только если передан параметр newPrice
    if (newPrice) {
      setCar(prevCar => {
        if (!prevCar) return null;
        
        // Обновляем цену только если она выше текущей
        if (parseFloat(newPrice) > parseFloat(prevCar.current_price)) {
          console.log('AuctionPage: Updating car price from', prevCar.current_price, 'to', newPrice);
          return {
            ...prevCar,
            current_price: newPrice
          };
        }
        return prevCar;
      });
    }
    
    // Добавляем специальный метод к функции обновления для получения ссылки на функции
    handleBidsUpdate.setExportedFunctions = functions => {
      console.log('AuctionPage: Received exported functions from RealtimeBidDisplay:', !!functions);
      setBidListFunctions(functions);
    };
    
    return true;
  }, []);
  
  // Наблюдаем за новой ставкой через bidListFunctions
  useEffect(() => {
    console.log('AuctionPage: bidListFunctions updated:', !!bidListFunctions);
  }, [bidListFunctions]);
  
  // Показываем индикатор загрузки
  if (loading) {
    return <Loader size="large" text="Загрузка информации об аукционе..." />;
  }
  
  // Показываем сообщение об ошибке, если не удалось загрузить данные
  if (error || !car) {
    // Если ошибка связана с авторизацией, показываем специальный компонент
    if (isAuthError) {
      return (
        <AuthRequiredError 
          message="Для просмотра лота, вам надо зайти или зарегистрироваться"
          returnPath="/"
        />
      );
    }
    
    // Иначе показываем стандартную ошибку
    return (
      <div className="error-container">
        <h2>Ограниченный доступ</h2>
        <p>Для просмотра лота, вам надо зайти или зарегистрироваться</p>
        <div className="auth-options">
          <div className="auth-buttons">
            <Link to="/login" className="auth-button login-button">
              Войти
            </Link>
            <Link to="/register" className="auth-button register-button">
              Зарегистрироваться
            </Link>
          </div>
        </div>
        <Link to="/" className="auth-button login-button" style={{ marginTop: '15px' }}>
          Вернуться на главную
        </Link>
      </div>
    );
  }
  
  // Определяем состояние аукциона
  const isOwner = user && car.seller && user.id === car.seller.id;
  const isActive = car.status === 'active' && car.time_remaining > 0;
  const isPending = car.status === 'pending';
  
  // Вычисляем время до начала аукциона если он в состоянии ожидания
  const timeUntilStart = isPending && car.start_time ? 
    Math.max(0, Math.floor((new Date(car.start_time) - new Date()) / 1000)) : 0;
  
  return (
    <div className="auction-page">
      <div className="auction-container">
        <div className="auction-header">
          <h1>{car.brand} {car.model} ({car.year})</h1>
          
          <div className="auction-status">
            <span className={`status-badge status-${car.status}`}>
              {car.status === 'pending' ? 'Ожидание' : 
               car.status === 'completed' ? 'Завершен' : 
               car.status === 'cancelled' ? 'Отменен' : 
               car.status.charAt(0).toUpperCase() + car.status.slice(1)}
            </span>
            
            {isActive && (
              <Timer endTime={car.end_time} timeRemaining={car.time_remaining} />
            )}
            
            {isPending && car.start_time && (
              <div className="pending-timer">
                <Timer endTime={car.start_time} timeRemaining={timeUntilStart} />
                <span className="pending-message">до начала аукциона</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="auction-content">
          <div className="auction-main">
            <div className="car-images-gallery">
              {/* Основное изображение или галерея */}
              <div className="car-image-main">
                {car.images && car.images.length > 0 ? (
                  <ImageGallery car={car} />
                ) : car.image_url ? (
                  // Поддержка обратной совместимости для одного изображения
                  <img 
                    src={car.image_url.includes('0.0.0.0') 
                      ? `/media/${car.image_url.split('/media/')[1]}` 
                      : car.image_url} 
                    alt={`${car.brand} ${car.model}`} 
                    className="main-gallery-image"
                  />
                ) : (
                  <div className="no-image">
                    <i className="fas fa-car"></i>
                    <span>Изображение отсутствует</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="car-details">
              <div className="detail-row">
                <div className="detail-group">
                  <span className="detail-label">Марка</span>
                  <span className="detail-value">{car.brand}</span>
                </div>
                
                <div className="detail-group">
                  <span className="detail-label">Модель</span>
                  <span className="detail-value">{car.model}</span>
                </div>
                
                <div className="detail-group">
                  <span className="detail-label">Год</span>
                  <span className="detail-value">{car.year}</span>
                </div>
              </div>
              
              <div className="detail-row">
                <div className="detail-group">
                  <span className="detail-label">Пробег</span>
                  <span className="detail-value">{car.mileage} км</span>
                </div>
                
                <div className="detail-group">
                  <span className="detail-label">Начальная цена</span>
                  <span className="detail-value">{formatCurrency(car.starting_price)}</span>
                </div>
                
                <div className="detail-group">
                  <span className="detail-label">Текущая цена</span>
                  <span className="detail-value current-price">{formatCurrency(car.current_price)}</span>
                </div>
              </div>
              
              <div className="detail-row">
                <div className="detail-group">
                  <span className="detail-label">Продавец</span>
                  <span className="detail-value">
                    {car.seller ? (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <Link 
                          to={`/seller/${car.seller.id}`} 
                          className="seller-link"
                          title="Посмотреть профиль продавца"
                        >
                          {car.seller.username} 
                        </Link>
                        {car.seller.profile?.rating > 0 && (
                          <span className="seller-rating-preview" style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            marginTop: '4px',
                            background: 'rgba(40, 40, 40, 0.8)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            maxWidth: 'fit-content'
                          }}>
                            <i className="fas fa-star" style={{ color: '#FFD700', marginRight: '4px' }}></i> 
                            {parseFloat(car.seller.profile.rating).toFixed(1)}
                          </span>
                        )}
                        {!isOwner && user && (
                          <div className="mt-2">
                            <StartChatButton 
                              carId={car.id} 
                              sellerId={car.seller.id} 
                              size="sm" 
                              variant="outline-secondary"
                              style={{ padding: '1px 5px' }}
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      'Неизвестно'
                    )}
                  </span>
                </div>
                
                <div className="detail-group">
                  <span className="detail-label">Создан</span>
                  <span className="detail-value">{formatDate(car.created_at)}</span>
                </div>
                
                <div className="detail-group">
                  <span className="detail-label">Время окончания</span>
                  <span className="detail-value">{formatDate(car.end_time)}</span>
                </div>
              </div>
              
              {car.tags && car.tags.length > 0 && (
                <div className="car-tags">
                  <span className="tags-label">Теги:</span>
                  <div className="tags-list">
                    {car.tags.map(tag => (
                      <span key={tag.id} className="tag">{tag.name}</span>
                    ))}
                  </div>
                </div>
              )}
              
              {car.payment_methods && car.payment_methods.length > 0 && (
                <div className="payment-methods">
                  <span className="payment-label">Принимаемые способы оплаты:</span>
                  <div className="payment-list">
                    {car.payment_methods.map(method => (
                      <span key={method.id} className="payment-method">{method.name}</span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="car-description">
                <h3>Описание</h3>
                <p>{car.description}</p>
              </div>
            </div>
          </div>
          
          <div className="auction-sidebar">
            {/* Форма размещения ставок (только для не-владельцев) */}
            {!isOwner && user && (
              <SimpleBidForm 
                car={car} 
                onBidPlaced={handleBidPlaced} 
              />
            )}
            
            {/* Компонент отображения ставок */}
            <RealtimeBidDisplay 
              auctionId={id} 
              initialBids={bids} 
              onBidUpdate={handleBidsUpdate}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuctionPage;