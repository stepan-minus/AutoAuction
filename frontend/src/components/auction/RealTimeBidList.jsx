import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { formatCurrency } from '../../utils/formatDate';
import { useAuth } from '../../context/AuthContext';
import websocketManager from '../../utils/realTimeWebSocket';
import '../../styles/realTimeBidList.css';

/**
 * Компонент для отображения списка ставок в режиме реального времени
 * @param {number} auctionId - ID аукциона
 * @param {array} initialBids - Начальный список ставок
 * @param {function} onBidUpdate - Колбэк для обновления цены в родительском компоненте
 */
const RealTimeBidList = ({ auctionId, initialBids = [], onBidUpdate = null }) => {
  const { user } = useAuth();
  const [bids, setBids] = useState(initialBids);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({ connecting: true });

  // WebSocket путь для этого аукциона
  const wsPath = useMemo(() => `auction/${auctionId}`, [auctionId]);

  // Отображаем бейджик статуса соединения
  const connectionBadge = useMemo(() => {
    if (connectionStatus.connected) {
      return <span className="connection-badge connected">Соединение установлено</span>;
    } else if (connectionStatus.connecting) {
      return <span className="connection-badge connecting">Подключение...</span>;
    } else if (connectionStatus.reconnecting) {
      return (
        <span className="connection-badge reconnecting">
          Переподключение{connectionStatus.attempt ? ` (${connectionStatus.attempt})` : ''}...
        </span>
      );
    } else if (connectionStatus.error) {
      // Более детальная информация об ошибках
      let errorMessage = "Ошибка соединения";
      if (connectionStatus.message) {
        if (connectionStatus.message.includes('Превышено максимальное количество попыток')) {
          errorMessage = "Не удалось установить соединение";
        } else if (connectionStatus.message.includes('token') || connectionStatus.message.includes('авторизации')) {
          errorMessage = "Ошибка авторизации";
        }
      } else if (connectionStatus.code) {
        if (connectionStatus.code === 1006) {
          errorMessage = "Соединение прервано";
        } else if (connectionStatus.code === 1011) {
          errorMessage = "Внутренняя ошибка сервера";
        } else if (connectionStatus.code === 1008 || connectionStatus.code === 401) {
          errorMessage = "Ошибка авторизации";
        }
      }
      
      return (
        <span 
          className="connection-badge error" 
          title={connectionStatus.message || `Ошибка соединения (код: ${connectionStatus.code || 'неизвестно'})`}
        >
          {errorMessage}
        </span>
      );
    } else {
      return <span className="connection-badge disconnected">Нет соединения</span>;
    }
  }, [connectionStatus]);

  // Обработчик сообщений от WebSocket
  const handleMessage = useCallback((message) => {
    let data;
    
    try {
      // Проверяем и парсим сообщение
      if (typeof message === 'string') {
        try {
          data = JSON.parse(message);
        } catch (parseError) {
          console.error('[RealTimeBidList] Error parsing WebSocket message:', parseError);
          console.log('[RealTimeBidList] Raw message:', message);
          return;
        }
      } else {
        data = message;
      }
      
      // Проверяем, что сообщение не пустое и имеет правильный формат
      if (!data || typeof data !== 'object') {
        console.warn('[RealTimeBidList] Received invalid message format:', data);
        return;
      }
      
      console.log('[RealTimeBidList] Received message:', data);
      
      // Обрабатываем пинг-сообщения
      if (data.type === 'ping' || data.type === 'pong') {
        return; // Игнорируем пинг-сообщения
      }
      
      // Обрабатываем обновление ставки
      if (data.type === 'bid_update') {
        if (!data.bid) {
          console.warn('[RealTimeBidList] Received bid_update without bid data:', data);
          return;
        }
        
        // Обновляем список ставок
        setBids(prevBids => {
          // Проверяем, есть ли уже такая ставка
          const existingBidIndex = prevBids.findIndex(bid => bid.id === data.bid.id);
          
          // Если ставка уже есть, обновляем её
          if (existingBidIndex >= 0) {
            const updatedBids = [...prevBids];
            updatedBids[existingBidIndex] = data.bid;
            return updatedBids;
          }
          
          // Иначе добавляем новую ставку в начало списка
          return [data.bid, ...prevBids];
        });
        
        // Уведомляем родительский компонент об обновлении цены
        if (onBidUpdate && data.current_price) {
          onBidUpdate(data.current_price, data.bid);
        }
      } else {
        console.log(`[RealTimeBidList] Unhandled message type: ${data.type}`);
      }
    } catch (error) {
      console.error('[RealTimeBidList] Error processing message:', error);
    }
  }, [onBidUpdate]);

  // Обработчик изменения статуса WebSocket соединения
  const handleStatusChange = useCallback((status) => {
    console.log('[RealTimeBidList] WebSocket status:', status);
    setConnectionStatus(status);
    setIsConnected(status.connected);
  }, []);

  // Подключаемся к WebSocket при монтировании компонента
  useEffect(() => {
    console.log(`[RealTimeBidList] Setting up WebSocket for auction ${auctionId}`);
    
    // Создаем соединение
    const connection = websocketManager.connect(
      wsPath,
      handleMessage,
      handleStatusChange
    );
    
    // Отключаемся при размонтировании компонента
    return () => {
      console.log(`[RealTimeBidList] Cleaning up WebSocket for auction ${auctionId}`);
      if (connection) {
        connection.disconnect();
      }
    };
  }, [auctionId, wsPath, handleMessage, handleStatusChange]);

  // Если нет ставок, отображаем сообщение
  if (!bids || bids.length === 0) {
    return (
      <div className="real-time-bid-list empty">
        <h3 className="bids-title">История ставок</h3>
        {connectionBadge}
        <p className="no-bids-message">На этот лот еще не сделано ни одной ставки.</p>
        <p className="be-first-message">Будьте первым!</p>
      </div>
    );
  }

  return (
    <div className="real-time-bid-list">
      <div className="bids-header">
        <h3 className="bids-title">История ставок</h3>
        {connectionBadge}
      </div>
      
      <ul className="bids-list">
        {bids.map(bid => (
          <li 
            key={bid.id} 
            className={`bid-item ${user && bid.bidder && bid.bidder.id === user.id ? 'your-bid' : ''}`}
          >
            <div className="bid-user">
              <span className="username">{bid.bidder?.username || 'Неизвестный пользователь'}</span>
              {user && bid.bidder && bid.bidder.id === user.id && (
                <span className="your-bid-badge">Ваша ставка</span>
              )}
            </div>
            <span className="bid-amount">{formatCurrency(bid.amount)}</span>
            <span className="bid-time">
              {new Date(bid.created_at).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </li>
        ))}
      </ul>
      
      {bids.length > 10 && (
        <button className="show-all-bids">
          Показать все ставки ({bids.length})
        </button>
      )}
    </div>
  );
};

export default RealTimeBidList;