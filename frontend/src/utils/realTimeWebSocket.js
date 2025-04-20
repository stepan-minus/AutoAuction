/**
 * Улучшенный модуль для работы с WebSocket соединениями с автоматическим восстановлением соединения
 */
import { createRef } from 'react';

// Базовый URL для WebSocket
const getBaseWSUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  console.log(`WebSocket base URL: ${protocol}//${host}`);
  return `${protocol}//${host}`;
};

// Таймаут для переподключения в мс
const RECONNECT_TIMEOUT = 2000;
// Максимальное количество попыток переподключения
const MAX_RECONNECT_ATTEMPTS = 10;
// Интервал проверки соединения в мс
const PING_INTERVAL = 20000;

class RealTimeWebSocket {
  constructor() {
    // Хранилище для активных соединений
    this.connections = new Map();
    // Статусы соединений
    this.connectionStatus = new Map();
    // Счетчики попыток переподключения
    this.reconnectAttempts = new Map();
    // Интервалы для пинга
    this.pingIntervals = new Map();
    // Таймеры для переподключения
    this.reconnectTimers = new Map();
    // Токен аутентификации
    this.token = null;
    // Создаем глобальный обработчик для обновления токена
    this.setUpTokenRefreshListener();
  }

  // Обновляем токен когда он меняется
  setUpTokenRefreshListener() {
    window.addEventListener('storage', (event) => {
      if (event.key === 'access_token') {
        this.token = event.newValue;
        console.log('[WebSocket] Token updated from storage event');
        // Переподключаем все соединения с новым токеном
        this.reconnectAllWithNewToken();
      }
    });
    
    // Инициализация при создании экземпляра
    this.token = localStorage.getItem('access_token');
    console.log('[WebSocket] Initial token retrieved:', this.token ? 'Token exists' : 'No token');
  }

  // Переподключаем все соединения с новым токеном
  reconnectAllWithNewToken() {
    for (const [path, connectionInfo] of this.connections.entries()) {
      // Закрываем текущее соединение
      if (connectionInfo.socket && 
          connectionInfo.socket.current && 
          connectionInfo.socket.current.readyState === WebSocket.OPEN) {
        connectionInfo.socket.current.close(1000, 'Token updated');
      }
      
      // Инициируем переподключение
      this.connect(
        path, 
        connectionInfo.messageCallback,
        connectionInfo.statusCallback
      );
    }
  }

  /**
   * Создает или возвращает существующее WebSocket соединение
   * @param {string} path - Путь для соединения (например, 'auction/1')
   * @param {Function} onMessage - Функция обработки сообщений
   * @param {Function} onStatusChange - Функция для обработки изменения статуса соединения
   * @returns {object} Информацию о соединении: {socket, status, disconnect}
   */
  connect(path, onMessage, onStatusChange = null) {
    if (!path) {
      console.error('WebSocket connect: путь не указан');
      return null;
    }

    // Проверяем наличие существующего соединения
    if (this.connections.has(path)) {
      const connection = this.connections.get(path);
      
      // Обновляем колбэки если нужно
      if (onMessage) {
        connection.messageCallback = onMessage;
      }
      
      if (onStatusChange) {
        connection.statusCallback = onStatusChange;
        // Сразу вызываем колбэк с текущим статусом
        onStatusChange(this.connectionStatus.get(path) || { connected: false });
      }
      
      return {
        socket: connection.socket,
        status: this.connectionStatus.get(path) || { connected: false },
        disconnect: () => this.disconnect(path)
      };
    }

    // Создаем ссылку на сокет
    const socketRef = createRef();
    
    // Формируем URL
    let wsUrl = this.formatWebSocketUrl(path);
    
    // Создаем информацию о соединении
    const connectionInfo = {
      socket: socketRef,
      messageCallback: onMessage,
      statusCallback: onStatusChange,
      reconnecting: false
    };
    
    // Сохраняем информацию в карту соединений
    this.connections.set(path, connectionInfo);
    
    // Устанавливаем начальный статус
    this.connectionStatus.set(path, { connected: false, connecting: true });
    
    // Уведомляем о статусе
    if (onStatusChange) {
      onStatusChange({ connected: false, connecting: true });
    }
    
    // Обновляем токен перед установкой соединения
    this.token = localStorage.getItem('access_token');
    console.log(`[WebSocket] Using token for connection to ${path}:`, this.token ? 'Token exists' : 'No token');
    
    // Создаем соединение
    this.createWebSocketConnection(path, wsUrl, socketRef, onMessage, onStatusChange);
    
    // Устанавливаем пинг
    this.setupPingInterval(path);
    
    // Возвращаем информацию для использования
    return {
      socket: socketRef,
      status: this.connectionStatus.get(path) || { connected: false },
      disconnect: () => this.disconnect(path)
    };
  }

  /**
   * Форматирует URL для WebSocket
   * @param {string} path - Путь для соединения
   * @returns {string} Полный URL для WebSocket
   */
  formatWebSocketUrl(path) {
    // Формируем базовый URL
    const baseUrl = getBaseWSUrl();
    
    // Определяем путь для WebSocket
    let wsPath;
    
    if (path === 'auctions') {
      wsPath = 'ws/auctions/';
    } else if (path.startsWith('auction/')) {
      const auctionId = path.replace('auction/', '');
      wsPath = `ws/auction/${auctionId}/`;
    } else if (path === 'notifications') {
      wsPath = 'ws/notifications/';
    } else if (path === 'chat-notifications') {
      wsPath = 'ws/chat-notifications/';
    } else if (path.startsWith('chat/')) {
      const chatId = path.replace('chat/', '');
      wsPath = `ws/chat/${chatId}/`;
    } else {
      wsPath = `ws/${path}/`;
    }
    
    // Добавляем токен если он есть
    let wsUrl = `${baseUrl}/${wsPath}`;
    
    if (this.token) {
      wsUrl += `?token=${this.token}`;
    }
    
    return wsUrl;
  }

  /**
   * Создает WebSocket соединение
   * @param {string} path - Путь соединения (ключ)
   * @param {string} url - Полный URL для WebSocket
   * @param {object} socketRef - Ссылка на сокет
   * @param {Function} onMessage - Функция обработки сообщений
   * @param {Function} onStatusChange - Функция обработки изменения статуса
   */
  createWebSocketConnection(path, url, socketRef, onMessage, onStatusChange) {
    try {
      console.log(`[WebSocket] Connecting to: ${url}`);
      
      // Создаем WebSocket
      const socket = new WebSocket(url);
      socketRef.current = socket;
      
      // Устанавливаем обработчики событий
      socket.onopen = () => {
        console.log(`[WebSocket] Connected: ${path}`);
        
        // Сбрасываем счетчик попыток
        this.reconnectAttempts.set(path, 0);
        
        // Очищаем таймер переподключения если он есть
        if (this.reconnectTimers.has(path)) {
          clearTimeout(this.reconnectTimers.get(path));
          this.reconnectTimers.delete(path);
        }
        
        // Устанавливаем статус соединения
        const status = { connected: true, connecting: false };
        this.connectionStatus.set(path, status);
        
        // Уведомляем о статусе
        if (onStatusChange) {
          onStatusChange(status);
        }
        
        // Сбрасываем флаг переподключения
        const connection = this.connections.get(path);
        if (connection) {
          connection.reconnecting = false;
        }
      };
      
      socket.onmessage = (event) => {
        try {
          // Вызываем обработчик сообщений
          if (onMessage && typeof onMessage === 'function') {
            onMessage(event.data);
          }
        } catch (error) {
          console.error(`[WebSocket] Error processing message: ${error.message}`);
        }
      };
      
      socket.onclose = (event) => {
        console.log(`[WebSocket] Closed: ${path} (${event.code})`);
        
        // Обновляем статус соединения
        const status = { connected: false, connecting: false, code: event.code };
        this.connectionStatus.set(path, status);
        
        // Уведомляем о статусе
        if (onStatusChange) {
          onStatusChange(status);
        }
        
        // Если это не нормальное закрытие, пытаемся переподключиться
        if (event.code !== 1000 && event.code !== 1005) {
          this.scheduleReconnect(path, url, socketRef, onMessage, onStatusChange);
        }
      };
      
      socket.onerror = (error) => {
        console.error(`[WebSocket] Error: ${path}`, error);
        
        // Обновляем статус соединения
        const status = { connected: false, connecting: false, error: true };
        this.connectionStatus.set(path, status);
        
        // Уведомляем о статусе
        if (onStatusChange) {
          onStatusChange(status);
        }
      };
    } catch (error) {
      console.error(`[WebSocket] Connection error: ${error.message}`);
      
      // Обновляем статус соединения
      const status = { connected: false, connecting: false, error: true, message: error.message };
      this.connectionStatus.set(path, status);
      
      // Уведомляем о статусе
      if (onStatusChange) {
        onStatusChange(status);
      }
      
      // Пытаемся переподключиться
      this.scheduleReconnect(path, url, socketRef, onMessage, onStatusChange);
    }
  }

  /**
   * Планирует переподключение
   * @param {string} path - Путь соединения (ключ)
   * @param {string} url - Полный URL для WebSocket
   * @param {object} socketRef - Ссылка на сокет
   * @param {Function} onMessage - Функция обработки сообщений
   * @param {Function} onStatusChange - Функция обработки изменения статуса
   */
  scheduleReconnect(path, url, socketRef, onMessage, onStatusChange) {
    // Получаем текущее число попыток
    const attempts = this.reconnectAttempts.get(path) || 0;
    
    // Если достигнуто максимальное число попыток, прекращаем
    if (attempts >= MAX_RECONNECT_ATTEMPTS) {
      console.log(`[WebSocket] Max reconnect attempts reached for ${path}`);
      
      // Обновляем статус соединения
      const status = { 
        connected: false, 
        connecting: false,
        error: true,
        message: 'Превышено максимальное количество попыток подключения'
      };
      this.connectionStatus.set(path, status);
      
      // Уведомляем о статусе
      if (onStatusChange) {
        onStatusChange(status);
      }
      
      return;
    }
    
    // Увеличиваем счетчик попыток
    this.reconnectAttempts.set(path, attempts + 1);
    
    // Получаем соединение и устанавливаем флаг переподключения
    const connection = this.connections.get(path);
    if (connection) {
      connection.reconnecting = true;
    }
    
    // Обновляем статус соединения
    const status = { connected: false, connecting: true, reconnecting: true, attempt: attempts + 1 };
    this.connectionStatus.set(path, status);
    
    // Уведомляем о статусе
    if (onStatusChange) {
      onStatusChange(status);
    }
    
    // Планируем переподключение
    const timer = setTimeout(() => {
      console.log(`[WebSocket] Reconnecting to ${path} (attempt ${attempts + 1})`);
      
      // Пересоздаем URL с актуальным токеном
      const freshUrl = this.formatWebSocketUrl(path);
      
      // Создаем новое соединение
      this.createWebSocketConnection(path, freshUrl, socketRef, onMessage, onStatusChange);
    }, RECONNECT_TIMEOUT * (attempts + 1)); // Увеличиваем таймаут с каждой попыткой
    
    // Сохраняем таймер
    this.reconnectTimers.set(path, timer);
  }

  /**
   * Устанавливает интервал для пинга соединения
   * @param {string} path - Путь соединения (ключ)
   */
  setupPingInterval(path) {
    // Если уже есть интервал, очищаем его
    if (this.pingIntervals.has(path)) {
      clearInterval(this.pingIntervals.get(path));
    }
    
    // Создаем новый интервал
    const interval = setInterval(() => {
      // Получаем соединение
      const connection = this.connections.get(path);
      if (!connection || !connection.socket || !connection.socket.current) {
        return;
      }
      
      // Проверяем состояние сокета
      const socket = connection.socket.current;
      
      // Если сокет открыт, отправляем пинг
      if (socket.readyState === WebSocket.OPEN) {
        try {
          // Отправляем JSON объект с type: "ping"
          socket.send(JSON.stringify({ type: 'ping' }));
        } catch (error) {
          console.warn(`[WebSocket] Error sending ping: ${error.message}`);
        }
      }
      // Если сокет закрыт и не переподключается, пытаемся переподключиться
      else if (socket.readyState === WebSocket.CLOSED && !connection.reconnecting) {
        console.log(`[WebSocket] Detected closed connection for ${path}, reconnecting...`);
        
        // Формируем URL
        const wsUrl = this.formatWebSocketUrl(path);
        
        // Запускаем переподключение
        this.scheduleReconnect(
          path, 
          wsUrl, 
          connection.socket, 
          connection.messageCallback, 
          connection.statusCallback
        );
      }
    }, PING_INTERVAL);
    
    // Сохраняем интервал
    this.pingIntervals.set(path, interval);
  }

  /**
   * Отключает WebSocket соединение
   * @param {string} path - Путь соединения (ключ)
   */
  disconnect(path) {
    // Проверяем наличие соединения
    if (!this.connections.has(path)) {
      return;
    }
    
    console.log(`[WebSocket] Disconnecting: ${path}`);
    
    // Получаем информацию о соединении
    const connection = this.connections.get(path);
    
    // Очищаем интервал пинга
    if (this.pingIntervals.has(path)) {
      clearInterval(this.pingIntervals.get(path));
      this.pingIntervals.delete(path);
    }
    
    // Очищаем таймер переподключения
    if (this.reconnectTimers.has(path)) {
      clearTimeout(this.reconnectTimers.get(path));
      this.reconnectTimers.delete(path);
    }
    
    // Закрываем сокет
    if (connection && connection.socket && connection.socket.current) {
      const socket = connection.socket.current;
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close(1000, 'Disconnected by client');
      }
    }
    
    // Удаляем информацию о соединении
    this.connections.delete(path);
    this.connectionStatus.delete(path);
    this.reconnectAttempts.delete(path);
  }

  /**
   * Отправляет сообщение через WebSocket
   * @param {string} path - Путь соединения (ключ)
   * @param {object} data - Данные для отправки (будут преобразованы в JSON)
   * @returns {boolean} Успешность отправки
   */
  send(path, data) {
    // Проверяем наличие соединения
    if (!this.connections.has(path)) {
      console.error(`[WebSocket] Cannot send: no connection for ${path}`);
      return false;
    }
    
    // Получаем информацию о соединении
    const connection = this.connections.get(path);
    
    // Проверяем наличие сокета
    if (!connection.socket || !connection.socket.current) {
      console.error(`[WebSocket] Cannot send: no socket for ${path}`);
      return false;
    }
    
    // Получаем сокет
    const socket = connection.socket.current;
    
    // Проверяем состояние сокета
    if (socket.readyState !== WebSocket.OPEN) {
      console.error(`[WebSocket] Cannot send: socket not open for ${path}`);
      return false;
    }
    
    // Отправляем данные
    try {
      socket.send(JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`[WebSocket] Error sending message: ${error.message}`);
      return false;
    }
  }
}

// Создаем единственный экземпляр класса
const websocketManager = new RealTimeWebSocket();

export default websocketManager;