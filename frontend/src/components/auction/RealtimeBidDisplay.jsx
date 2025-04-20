import React, { useState, useEffect, useCallback } from 'react';
import { formatCurrency } from '../../utils/formatDate';
import { useAuth } from '../../context/AuthContext';
import websocketManager from '../../utils/realTimeWebSocket';

/**
 * Компонент для отображения ставок в реальном времени
 * с поддержкой WebSocket для получения актуальных данных
 */
const RealtimeBidDisplay = ({ auctionId, initialBids = [], onBidUpdate = null }) => {
  const { user } = useAuth();
  const [bids, setBids] = useState(initialBids || []);
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());
  const [wsStatus, setWsStatus] = useState({ connected: false });
  
  // Сортируем ставки при первоначальной загрузке
  useEffect(() => {
    if (initialBids && initialBids.length > 0) {
      console.log('RealtimeBidDisplay: Initializing with provided bids:', initialBids.length);
      
      // Сортируем полученные ставки
      const sortedBids = [...initialBids].sort((a, b) => {
        // По сумме (убывание)
        if (parseFloat(a.amount) !== parseFloat(b.amount)) {
          return parseFloat(b.amount) - parseFloat(a.amount);
        }
        // По времени (сначала новые)
        return new Date(b.created_at) - new Date(a.created_at);
      });
      
      setBids(sortedBids);
    }
  }, []);
  
  // Метод для добавления новой ставки в список
  const addNewBid = useCallback((newBid) => {
    if (!newBid) return;
    
    console.log('RealtimeBidDisplay: Adding new bid to history:', newBid);
    
    // Обновляем список ставок
    setBids(prevBids => {
      // Создаем копию текущих ставок
      const updatedBids = Array.isArray(prevBids) ? [...prevBids] : [];
      
      // Проверяем, есть ли уже такая ставка
      const existingBidIndex = updatedBids.findIndex(bid => 
        bid.id === newBid.id || 
        (bid.amount === newBid.amount && bid.bidder?.id === newBid.bidder?.id)
      );
      
      if (existingBidIndex >= 0) {
        // Если ставка уже существует, обновляем её
        updatedBids[existingBidIndex] = newBid;
      } else {
        // Добавляем новую ставку
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
    
    // Устанавливаем время последнего обновления
    setLastUpdateTime(new Date());
    
    return true;
  }, []);
  
  // При первой загрузке компонента экспортируем метод добавления ставки в родительский компонент
  useEffect(() => {
    if (typeof onBidUpdate === 'function') {
      console.log('RealtimeBidDisplay: Exporting addNewBid method to parent');
      
      // Создаем объект с методом добавления ставки
      const bidFunctions = {
        addNewBid: addNewBid
      };
      
      // Сохраняем ссылку в родительском компоненте
      if (onBidUpdate.setExportedFunctions) {
        onBidUpdate.setExportedFunctions(bidFunctions);
      }
    }
    
    // Очистка при размонтировании
    return () => {
      if (typeof onBidUpdate === 'function' && onBidUpdate.setExportedFunctions) {
        onBidUpdate.setExportedFunctions(null);
      }
    };
  }, [addNewBid, onBidUpdate]);
  
  // Обработчик для WebSocket сообщений
  const handleWebSocketMessage = useCallback((message) => {
    try {
      // Пытаемся распарсить сообщение как JSON
      const data = typeof message === 'string' ? JSON.parse(message) : message;
      console.log('RealtimeBidDisplay: WebSocket message received:', data);
      
      // Обрабатываем различные типы сообщений
      if (data.type === 'bid_update' && data.bid) {
        console.log('RealtimeBidDisplay: New bid received from WebSocket:', data.bid);
        
        // Добавляем новую ставку в список
        addNewBid(data.bid);
        
        // Обновляем текущую цену в родительском компоненте
        if (onBidUpdate && data.current_price) {
          onBidUpdate(data.current_price, data.bid);
        }
      } else if (data.type === 'auction_state') {
        // Обновляем состояние аукциона (цена, статус и т.д.)
        console.log('RealtimeBidDisplay: Auction state update received:', data);
        
        if (onBidUpdate && data.current_price) {
          onBidUpdate(data.current_price);
        }
      } else if (data.type === 'bids_list') {
        // Полное обновление списка ставок
        console.log('RealtimeBidDisplay: Full bids list received:', data.bids);
        
        if (data.bids && Array.isArray(data.bids)) {
          // Заменяем текущий список ставок
          setBids(prevBids => {
            const uniqueBids = [...data.bids];
            
            // Сортируем ставки
            return uniqueBids.sort((a, b) => {
              if (parseFloat(a.amount) !== parseFloat(b.amount)) {
                return parseFloat(b.amount) - parseFloat(a.amount);
              }
              return new Date(b.created_at) - new Date(a.created_at);
            });
          });
        }
        
        // Обновляем состояние времени обновления
        setLastUpdateTime(new Date());
      }
    } catch (error) {
      console.error('RealtimeBidDisplay: Error processing WebSocket message:', error);
    }
  }, [addNewBid, onBidUpdate]);
  
  // Обрабатывает изменения статуса WebSocket соединения
  const handleWebSocketStatus = useCallback((status) => {
    console.log('RealtimeBidDisplay: WebSocket status changed:', status);
    setWsStatus(status);
  }, []);
  
  // Устанавливаем WebSocket соединение
  useEffect(() => {
    if (!auctionId) return;
    
    console.log(`RealtimeBidDisplay: Setting up WebSocket for auction ${auctionId}`);
    
    // Устанавливаем соединение с WebSocket
    const connection = websocketManager.connect(
      `auction/${auctionId}`,
      handleWebSocketMessage,
      handleWebSocketStatus
    );
    
    // Отключаем соединение при размонтировании компонента
    return () => {
      console.log(`RealtimeBidDisplay: Cleaning up WebSocket for auction ${auctionId}`);
      if (connection) {
        connection.disconnect();
      }
    };
  }, [auctionId, handleWebSocketMessage, handleWebSocketStatus]);
  
  // Обновление цены при получении новой ставки
  useEffect(() => {
    if (onBidUpdate && bids.length > 0) {
      const highestBid = bids[0]; // После сортировки первая ставка - самая высокая
      if (highestBid) {
        // Вызываем обновление цены в родительском компоненте
        onBidUpdate(highestBid.amount, highestBid);
      }
    }
  }, [bids, onBidUpdate]);
  
  // Определяем текст и класс для индикатора WebSocket соединения
  const getConnectionStatus = () => {
    if (wsStatus.connected) {
      return { text: 'Онлайн', className: 'connected' };
    } else if (wsStatus.connecting || wsStatus.reconnecting) {
      return { text: 'Подключение...', className: 'connecting' };
    } else if (wsStatus.error) {
      return { text: 'Ошибка соединения', className: 'error' };
    } else {
      return { text: 'Не подключено', className: 'disconnected' };
    }
  };
  
  // Создаем элемент индикатора WebSocket соединения
  const connectionStatus = getConnectionStatus();
  const connectionBadge = (
    <span className={`connection-badge ${connectionStatus.className}`}>
      {connectionStatus.text}
    </span>
  );
  
  // Индикатор состояния подключения
  const statusIndicator = (
    <div className="bids-status">
      <div className="status-row">
        {connectionBadge}
      </div>
    </div>
  );
  
  // Если нет ставок
  if (!bids || bids.length === 0) {
    return (
      <div className="real-time-bid-list empty">
        <div className="bids-header">
          <h3 className="bids-title">История ставок</h3>
          {connectionBadge}
        </div>
        <p className="no-bids-message">На этот лот еще не сделано ни одной ставки.</p>
        <p className="be-first-message">Будьте первым!</p>
      </div>
    );
  }
  
  // Если есть ставки, отображаем список
  return (
    <div className="real-time-bid-list">
      <div className="bids-header">
        <h3 className="bids-title">История ставок</h3>
        {connectionBadge}
      </div>
      
      <ul className="bids-list">
        {bids.map(bid => {
          // Добавляем проверку на наличие bidder и username для предотвращения ошибок
          const bidderName = bid.bidder && bid.bidder.username 
            ? bid.bidder.username 
            : bid.bidder_name || 'Неизвестный';
            
          const isYourBid = user && bid.bidder && bid.bidder.id === user.id;
          
          // Убедимся, что у каждой ставки есть уникальный ключ
          // Если id отсутствует, создаем уникальный ключ, основанный на сумме ставки и времени
          const bidKey = bid.id || `bid-${bid.amount}-${bid.created_at}`;
          
          return (
            <li key={bidKey} className={`bid-item ${isYourBid ? 'your-bid' : ''}`}>
              <div className="bid-user">
                <span className="username">{bidderName}</span>
                {isYourBid && <span className="your-bid-badge">Ваша ставка</span>}
              </div>
              <span className="bid-amount">{formatCurrency(bid.amount)}</span>
              <span className="bid-time">
                {new Date(bid.created_at).toLocaleTimeString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </li>
          );
        })}
      </ul>
      
      <div className="bid-list-footer">
        <p className="bid-count">{bids.length}</p>
      </div>
    </div>
  );
};

export default RealtimeBidDisplay;