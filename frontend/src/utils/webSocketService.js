/**
 * Новый сервис для управления WebSocket соединениями
 * Упрощённая и более надёжная версия с улучшенным логированием
 */

import { createLogger } from './logger';
import { WS_BASE_URL } from '../api/config';

const RECONNECT_DELAY = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;

// Создаем логгер для этого модуля
const logger = createLogger('WebSocketService');

class WebSocketService {
  constructor() {
    this.connections = {};
    this.token = null;
    this.updateTokenFromStorage();
    
    // Слушаем изменения токена
    window.addEventListener('storage', this.handleStorageChange);
    
    logger.info('WebSocket service initialized');
  }
  
  /**
   * Обновляет токен из localStorage
   */
  updateTokenFromStorage = () => {
    this.token = localStorage.getItem('access_token');
    logger.debug('Token updated:', this.token ? 'Token exists' : 'No token');
  }
  
  /**
   * Обрабатывает изменения в localStorage
   */
  handleStorageChange = (event) => {
    if (event.key === 'access_token') {
      this.token = event.newValue;
      logger.info('Token changed:', this.token ? 'New token set' : 'Token removed');
      
      // Перезапускаем все соединения с новым токеном
      Object.keys(this.connections).forEach(path => {
        logger.debug(`Reconnecting ${path} due to token change`);
        this.reconnect(path);
      });
    }
  }

  /**
   * Создает WebSocket URL
   */
  createWebSocketUrl(path) {
    // Используем window.location для определения протокола и хоста
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsBase = WS_BASE_URL || '/ws';
    
    // Формируем базовый URL
    let wsUrl = `${protocol}//${host}${wsBase}/${path}/`;
    
    // Добавляем токен, если он есть
    if (this.token) {
      wsUrl += `?token=${this.token}`;
    }
    
    logger.debug(`WebSocket URL for ${path}: ${wsUrl}`);
    return wsUrl;
  }

  /**
   * Подключается к WebSocket и настраивает обработчики событий
   */
  connect(path, onMessage, onConnectionStatusChange) {
    if (!path) {
      logger.error('Path is required for WebSocket connection');
      return null;
    }
    
    if (this.connections[path]) {
      logger.debug(`Connection to ${path} already exists`);
      return this.connections[path];
    }
    
    logger.info(`Connecting to WebSocket path: ${path}`);
    
    // Обновляем токен перед подключением
    this.updateTokenFromStorage();
    
    // Создаем объект соединения
    const connection = {
      socket: null,
      path,
      onMessage,
      onConnectionStatusChange,
      isConnected: false,
      isConnecting: true,
      reconnectAttempts: 0,
      reconnectTimeout: null
    };
    
    // Сохраняем соединение
    this.connections[path] = connection;
    
    // Оповещаем о статусе
    if (onConnectionStatusChange) {
      onConnectionStatusChange({ connected: false, connecting: true });
    }
    
    // Устанавливаем соединение
    this.establishConnection(path);
    
    // Возвращаем методы для работы с соединением
    return {
      send: (data) => this.send(path, data),
      disconnect: () => this.disconnect(path),
      reconnect: () => this.reconnect(path),
      getStatus: () => this.getConnectionStatus(path)
    };
  }

  /**
   * Устанавливает WebSocket соединение
   */
  establishConnection(path) {
    const connection = this.connections[path];
    if (!connection) return;
    
    // Очищаем существующее соединение если есть
    if (connection.socket) {
      try {
        connection.socket.close();
      } catch (e) {
        logger.error(`Error closing previous connection: ${e.message}`);
      }
    }
    
    try {
      const wsUrl = this.createWebSocketUrl(path);
      logger.info(`Establishing connection to ${wsUrl}`);
      
      // Создаем WebSocket
      const socket = new WebSocket(wsUrl);
      connection.socket = socket;
      connection.isConnecting = true;
      
      // Оповещаем о статусе
      if (connection.onConnectionStatusChange) {
        connection.onConnectionStatusChange({ connected: false, connecting: true });
      }
      
      // Настраиваем обработчики
      socket.onopen = () => this.handleOpen(path);
      socket.onmessage = (event) => this.handleMessage(path, event);
      socket.onclose = (event) => this.handleClose(path, event);
      socket.onerror = (error) => this.handleError(path, error);
    } catch (error) {
      logger.error(`Connection error: ${error.message}`);
      this.scheduleReconnect(path);
    }
  }

  /**
   * Обрабатывает открытие соединения
   */
  handleOpen(path) {
    const connection = this.connections[path];
    if (!connection) return;
    
    logger.info(`Connected successfully to ${path}`);
    
    connection.isConnected = true;
    connection.isConnecting = false;
    connection.reconnectAttempts = 0;
    
    // Оповещаем о статусе
    if (connection.onConnectionStatusChange) {
      connection.onConnectionStatusChange({ connected: true, connecting: false });
    }
    
    // Отправляем пинг каждые 30 секунд для поддержания соединения
    connection.pingInterval = setInterval(() => {
      this.sendPing(path);
    }, 30000);
  }

  /**
   * Обрабатывает входящие сообщения
   */
  handleMessage(path, event) {
    const connection = this.connections[path];
    if (!connection) return;
    
    try {
      logger.debug(`Received message from ${path}`, event.data.substring(0, 100) + (event.data.length > 100 ? '...' : ''));
      
      // Если есть обработчик сообщений, вызываем его
      if (connection.onMessage) {
        connection.onMessage(event.data);
      }
    } catch (error) {
      logger.error(`Error processing message: ${error.message}`);
    }
  }

  /**
   * Обрабатывает закрытие соединения
   */
  handleClose(path, event) {
    const connection = this.connections[path];
    if (!connection) return;
    
    logger.info(`Connection to ${path} closed (code: ${event.code}, reason: ${event.reason || 'none'})`);
    
    connection.isConnected = false;
    connection.isConnecting = false;
    
    // Очищаем интервал пинга
    if (connection.pingInterval) {
      clearInterval(connection.pingInterval);
      connection.pingInterval = null;
    }
    
    // Оповещаем о статусе
    if (connection.onConnectionStatusChange) {
      connection.onConnectionStatusChange({
        connected: false,
        connecting: false,
        code: event.code,
        reason: event.reason
      });
    }
    
    // Если соединение закрыто не по нашей инициативе, пытаемся переподключиться
    if (event.code !== 1000 && event.code !== 1001) {
      this.scheduleReconnect(path);
    }
  }

  /**
   * Обрабатывает ошибки соединения
   */
  handleError(path, error) {
    const connection = this.connections[path];
    if (!connection) return;
    
    logger.error(`Connection error for ${path}:`, error);
    
    // Оповещаем о статусе
    if (connection.onConnectionStatusChange) {
      connection.onConnectionStatusChange({
        connected: false,
        connecting: false,
        error: true,
        message: error.message || 'Connection error'
      });
    }
  }

  /**
   * Планирует переподключение
   */
  scheduleReconnect(path) {
    const connection = this.connections[path];
    if (!connection) return;
    
    // Очищаем существующий таймаут
    if (connection.reconnectTimeout) {
      clearTimeout(connection.reconnectTimeout);
      connection.reconnectTimeout = null;
    }
    
    // Если превышен лимит попыток, останавливаемся
    if (connection.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      logger.warn(`Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached for ${path}`);
      
      // Оповещаем о статусе
      if (connection.onConnectionStatusChange) {
        connection.onConnectionStatusChange({
          connected: false,
          connecting: false,
          error: true,
          message: `Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached`
        });
      }
      
      return;
    }
    
    // Увеличиваем счетчик попыток
    connection.reconnectAttempts++;
    
    // Вычисляем задержку с увеличением при каждой попытке
    const delay = RECONNECT_DELAY * Math.min(connection.reconnectAttempts, 3);
    
    logger.info(`Scheduling reconnect for ${path} in ${delay}ms (attempt ${connection.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
    
    // Оповещаем о статусе
    if (connection.onConnectionStatusChange) {
      connection.onConnectionStatusChange({
        connected: false,
        connecting: false,
        reconnecting: true,
        attempt: connection.reconnectAttempts,
        maxAttempts: MAX_RECONNECT_ATTEMPTS
      });
    }
    
    // Планируем переподключение
    connection.reconnectTimeout = setTimeout(() => {
      logger.info(`Reconnecting to ${path} (attempt ${connection.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
      this.establishConnection(path);
    }, delay);
  }

  /**
   * Отправляет пинг для поддержания соединения
   */
  sendPing(path) {
    const connection = this.connections[path];
    if (!connection || !connection.socket || connection.socket.readyState !== WebSocket.OPEN) return;
    
    try {
      logger.debug(`Sending ping to ${path}`);
      connection.socket.send(JSON.stringify({ type: 'ping' }));
    } catch (error) {
      logger.error(`Error sending ping: ${error.message}`);
    }
  }

  /**
   * Отправляет данные через WebSocket
   */
  send(path, data) {
    const connection = this.connections[path];
    if (!connection || !connection.socket) {
      logger.error(`Cannot send message - no connection for ${path}`);
      return false;
    }
    
    if (connection.socket.readyState !== WebSocket.OPEN) {
      logger.error(`Cannot send message - socket not open for ${path} (state: ${connection.socket.readyState})`);
      return false;
    }
    
    try {
      const payload = typeof data === 'string' ? data : JSON.stringify(data);
      connection.socket.send(payload);
      logger.debug(`Message sent to ${path}:`, payload.substring(0, 100) + (payload.length > 100 ? '...' : ''));
      return true;
    } catch (error) {
      logger.error(`Error sending message: ${error.message}`);
      return false;
    }
  }

  /**
   * Отключает WebSocket соединение
   */
  disconnect(path) {
    const connection = this.connections[path];
    if (!connection) {
      logger.debug(`No connection for ${path}`);
      return;
    }
    
    logger.info(`Disconnecting from ${path}`);
    
    // Очищаем интервал пинга
    if (connection.pingInterval) {
      clearInterval(connection.pingInterval);
      connection.pingInterval = null;
    }
    
    // Очищаем таймаут переподключения
    if (connection.reconnectTimeout) {
      clearTimeout(connection.reconnectTimeout);
      connection.reconnectTimeout = null;
    }
    
    // Закрываем соединение
    if (connection.socket) {
      try {
        connection.socket.close(1000, 'Disconnected by client');
      } catch (error) {
        logger.error(`Error closing connection: ${error.message}`);
      }
      connection.socket = null;
    }
    
    // Удаляем соединение
    delete this.connections[path];
  }

  /**
   * Принудительно переподключается к WebSocket
   */
  reconnect(path) {
    const connection = this.connections[path];
    if (!connection) {
      logger.debug(`No connection for ${path}`);
      return;
    }
    
    logger.info(`Manual reconnect requested for ${path}`);
    
    // Обнуляем счетчик попыток
    connection.reconnectAttempts = 0;
    
    // Переподключаемся
    this.establishConnection(path);
  }

  /**
   * Возвращает статус соединения
   */
  getConnectionStatus(path) {
    const connection = this.connections[path];
    if (!connection) {
      return { connected: false, connecting: false };
    }
    
    return {
      connected: connection.isConnected,
      connecting: connection.isConnecting,
      reconnecting: connection.reconnectAttempts > 0 && !!connection.reconnectTimeout,
      attempt: connection.reconnectAttempts,
      maxAttempts: MAX_RECONNECT_ATTEMPTS
    };
  }

  /**
   * Отключает все соединения
   */
  disconnectAll() {
    logger.info(`Disconnecting all WebSocket connections (count: ${Object.keys(this.connections).length})`);
    
    Object.keys(this.connections).forEach(path => {
      this.disconnect(path);
    });
  }
}

// Создаем и экспортируем сервис
const webSocketService = new WebSocketService();
export default webSocketService;