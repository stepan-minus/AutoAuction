/**
 * Сервис для управления WebSocket соединениями
 */

class WebSocketService {
  constructor() {
    this.connections = new Map(); // Хранит активные соединения WebSocket
    this.reconnectAttempts = new Map(); // Хранит попытки переподключения
    this.reconnectTimeouts = new Map(); // Хранит таймауты переподключения
    this.connectionTimeouts = new Map(); // Хранит таймауты соединения
    this.maxReconnectAttempts = 10; // Максимальное количество попыток переподключения
    this.keepAliveIntervals = new Map(); // Хранит интервалы для поддержания соединения
  }

  /**
   * Создает новое WebSocket соединение
   * @param {string} url - URL веб-сокета
   * @param {string} connectionId - Уникальный идентификатор соединения
   * @param {Object} callbacks - Колбеки для событий (onMessage, onError, etc.)
   * @returns {WebSocket} Объект WebSocket
   */
  createConnection(url, connectionId, callbacks = {}) {
    console.log(`WebSocketService: Создание нового соединения для ${connectionId}`);
    
    // Закрываем существующее соединение, если оно есть
    this.closeConnection(connectionId);
    
    try {
      // Создаем новое WebSocket соединение
      const ws = new WebSocket(url);
      
      // Настройка таймаута для соединения
      const connectionTimeout = setTimeout(() => {
        console.error(`WebSocketService: Превышено время ожидания подключения для ${connectionId}`);
        this.reconnect(url, connectionId, callbacks);
      }, 15000); // 15 секунд на подключение
      
      this.connectionTimeouts.set(connectionId, connectionTimeout);
      
      // Обработчик открытия соединения
      ws.onopen = (event) => {
        console.log(`WebSocketService: Соединение установлено для ${connectionId}`);
        clearTimeout(this.connectionTimeouts.get(connectionId));
        this.reconnectAttempts.set(connectionId, 0);
        
        // Устанавливаем интервал для поддержания соединения
        const keepAliveInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            console.log(`WebSocketService: Отправка ping для ${connectionId}`);
            ws.send(JSON.stringify({ type: 'ping' }));
          } else {
            clearInterval(this.keepAliveIntervals.get(connectionId));
          }
        }, 30000); // Отправляем ping каждые 30 секунд
        
        this.keepAliveIntervals.set(connectionId, keepAliveInterval);
        
        if (callbacks.onOpen) callbacks.onOpen(event);
      };
      
      // Обработчик сообщений
      ws.onmessage = (event) => {
        if (callbacks.onMessage) callbacks.onMessage(event);
      };
      
      // Обработчик ошибок
      ws.onerror = (error) => {
        console.error(`WebSocketService: Ошибка для ${connectionId}:`, error);
        if (callbacks.onError) callbacks.onError(error);
      };
      
      // Обработчик закрытия соединения
      ws.onclose = (event) => {
        console.log(`WebSocketService: Соединение закрыто для ${connectionId}. Код: ${event.code}, Причина: ${event.reason}`);
        clearTimeout(this.connectionTimeouts.get(connectionId));
        clearInterval(this.keepAliveIntervals.get(connectionId));
        
        if (callbacks.onClose) callbacks.onClose(event);
        
        // Пробуем переподключиться при неожиданном закрытии
        if (event.code !== 1000 && event.code !== 1001) {
          this.reconnect(url, connectionId, callbacks);
        } else {
          this.connections.delete(connectionId);
        }
      };
      
      // Сохраняем соединение
      this.connections.set(connectionId, ws);
      
      return ws;
    } catch (error) {
      console.error(`WebSocketService: Ошибка при создании соединения для ${connectionId}:`, error);
      setTimeout(() => {
        this.reconnect(url, connectionId, callbacks);
      }, 2000);
      return null;
    }
  }
  
  /**
   * Переподключается к WebSocket
   * @param {string} url - URL веб-сокета
   * @param {string} connectionId - Уникальный идентификатор соединения
   * @param {Object} callbacks - Колбеки для событий
   */
  reconnect(url, connectionId, callbacks) {
    // Отменяем существующий таймаут переподключения
    if (this.reconnectTimeouts.has(connectionId)) {
      clearTimeout(this.reconnectTimeouts.get(connectionId));
    }
    
    // Увеличиваем счетчик попыток
    const attempts = (this.reconnectAttempts.get(connectionId) || 0) + 1;
    this.reconnectAttempts.set(connectionId, attempts);
    
    if (attempts <= this.maxReconnectAttempts) {
      console.log(`WebSocketService: Попытка переподключения ${attempts}/${this.maxReconnectAttempts} для ${connectionId}`);
      
      // Прогрессивное увеличение времени между попытками (2s, 4s, 8s, ...)
      const delay = Math.min(30000, 1000 * Math.pow(2, attempts - 1));
      
      const timeout = setTimeout(() => {
        console.log(`WebSocketService: Переподключение к ${connectionId}...`);
        this.createConnection(url, connectionId, callbacks);
      }, delay);
      
      this.reconnectTimeouts.set(connectionId, timeout);
    } else {
      console.error(`WebSocketService: Превышено максимальное количество попыток для ${connectionId}`);
      if (callbacks.onReconnectFailed) callbacks.onReconnectFailed();
    }
  }
  
  /**
   * Отправляет сообщение через WebSocket
   * @param {string} connectionId - Идентификатор соединения
   * @param {Object|string} data - Данные для отправки
   * @returns {boolean} Успешна ли отправка
   */
  sendMessage(connectionId, data) {
    const ws = this.connections.get(connectionId);
    
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.log(`WebSocketService: Не удалось отправить сообщение для ${connectionId}: соединение не установлено`);
      return false;
    }
    
    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      ws.send(message);
      return true;
    } catch (error) {
      console.error(`WebSocketService: Ошибка при отправке сообщения для ${connectionId}:`, error);
      return false;
    }
  }
  
  /**
   * Закрывает соединение WebSocket
   * @param {string} connectionId - Идентификатор соединения
   */
  closeConnection(connectionId) {
    console.log(`WebSocketService: Закрытие соединения для ${connectionId}`);
    
    // Очищаем таймауты и интервалы
    if (this.connectionTimeouts.has(connectionId)) {
      clearTimeout(this.connectionTimeouts.get(connectionId));
      this.connectionTimeouts.delete(connectionId);
    }
    
    if (this.reconnectTimeouts.has(connectionId)) {
      clearTimeout(this.reconnectTimeouts.get(connectionId));
      this.reconnectTimeouts.delete(connectionId);
    }
    
    if (this.keepAliveIntervals.has(connectionId)) {
      clearInterval(this.keepAliveIntervals.get(connectionId));
      this.keepAliveIntervals.delete(connectionId);
    }
    
    // Закрываем соединение, если оно существует
    const ws = this.connections.get(connectionId);
    if (ws) {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close(1000, "Соединение закрыто клиентом");
      }
      this.connections.delete(connectionId);
    }
  }
  
  /**
   * Проверяет статус соединения
   * @param {string} connectionId - Идентификатор соединения
   * @returns {number|null} - Состояние WebSocket или null, если соединение не существует
   */
  getConnectionState(connectionId) {
    const ws = this.connections.get(connectionId);
    return ws ? ws.readyState : null;
  }
  
  /**
   * Закрывает все соединения
   */
  closeAllConnections() {
    console.log('WebSocketService: Закрытие всех соединений');
    
    for (const connectionId of this.connections.keys()) {
      this.closeConnection(connectionId);
    }
    
    // Очищаем все данные
    this.connections.clear();
    this.reconnectAttempts.clear();
    this.reconnectTimeouts.clear();
    this.connectionTimeouts.clear();
    this.keepAliveIntervals.clear();
  }
}

// Создаем и экспортируем синглтон
const webSocketService = new WebSocketService();
export default webSocketService;