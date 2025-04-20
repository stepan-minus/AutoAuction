import { useState, useEffect, useCallback } from 'react';
import websocketManager from '../utils/realTimeWebSocket';

/**
 * Хук для работы с WebSocket соединениями в режиме реального времени
 * @param {string} path - Путь для соединения (например, 'auction/1')
 * @param {boolean} enabled - Флаг, включено ли соединение
 * @returns {Object} Объект с информацией о соединении и функциями для работы с ним
 */
const useRealTimeConnection = (path, enabled = true) => {
  // Состояние подключения
  const [status, setStatus] = useState({ connected: false });
  // Состояние сообщений
  const [messages, setMessages] = useState([]);
  // Ссылка на соединение
  const [connection, setConnection] = useState(null);

  // Обработчик сообщений
  const handleMessage = useCallback((message) => {
    try {
      // Разбираем сообщение
      const data = typeof message === 'string' ? JSON.parse(message) : message;
      
      // Сохраняем сообщение в состояние
      setMessages(prev => [...prev, { data, timestamp: Date.now() }]);
    } catch (error) {
      console.error('[useRealTimeConnection] Error processing message:', error);
    }
  }, []);

  // Обработчик изменения статуса
  const handleStatusChange = useCallback((newStatus) => {
    setStatus(newStatus);
  }, []);

  // Подключаемся к WebSocket при монтировании компонента
  useEffect(() => {
    // Если путь не указан или соединение отключено, пропускаем
    if (!path || !enabled) {
      return;
    }

    // Создаем или получаем соединение
    const conn = websocketManager.connect(path, handleMessage, handleStatusChange);
    
    // Сохраняем ссылку на соединение
    setConnection(conn);

    // Отключаемся при размонтировании компонента
    return () => {
      if (conn) {
        conn.disconnect();
      }
    };
  }, [path, enabled, handleMessage, handleStatusChange]);

  // Функция для отправки сообщения
  const sendMessage = useCallback((data) => {
    if (!path || !enabled) {
      return false;
    }
    
    return websocketManager.send(path, data);
  }, [path, enabled]);

  // Функция для очистки сообщений
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Возвращаем объект с информацией о соединении и функциями для работы с ним
  return {
    status,
    messages,
    sendMessage,
    clearMessages,
    isConnected: status.connected
  };
};

export default useRealTimeConnection;