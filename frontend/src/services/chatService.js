import api from './api';
import axios from 'axios';
import webSocketService from './webSocketService';

const chatService = {
  /**
   * Получение списка диалогов
   */
  getConversations: async () => {
    try {
      console.log('Запрос списка диалогов');
      
      // Пробуем различные URL пути для получения списка диалогов
      let response;
      try {
        // Сначала пробуем основной путь
        response = await api.get('/chat/conversations/');
      } catch (initialError) {
        console.warn('Ошибка при запросе диалогов по основному пути:', initialError);
        
        try {
          // Пробуем альтернативный путь с /api
          console.log('Пробуем альтернативный путь с /api/chat...');
          response = await api.get('/api/chat/conversations/');
        } catch (apiError) {
          console.warn('Ошибка при запросе диалогов по альтернативному пути:', apiError);
          
          // Если оба не работают, создаем прямой запрос с полным URL
          const token = localStorage.getItem('access_token');
          if (!token) {
            console.error('Отсутствует токен доступа для запроса диалогов напрямую');
            return [];
          }
          
          // Пробуем прямой запрос через axios
          console.log('Пробуем прямой запрос через axios...');
          response = await axios.get('/chat/conversations/', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
        }
      }
      
      // Проверяем структуру ответа
      const data = response.data;
      console.log('Полученные данные диалогов:', data);
      
      // Обработка различных форматов ответа для обеспечения совместимости
      if (!data) {
        console.warn('Пустой ответ от сервера');
        return [];
      }
      
      // Если data это массив - возвращаем как есть
      if (Array.isArray(data)) {
        return data;
      }
      
      // Если data содержит массив results - возвращаем его (формат пагинации)
      if (data.results && Array.isArray(data.results)) {
        return data.results;
      }
      
      // Если это объект со статусом "ok" и data - это возможный старый формат
      if (data.status === 'ok') {
        // Если data.data существует и это массив, возвращаем его
        if (data.data && Array.isArray(data.data)) {
          return data.data;
        }
        // Иначе возвращаем пустой массив
        return [];
      }
      
      // Если ничего не подошло, просто возвращаем пустой массив
      console.warn('Неизвестный формат данных:', data);
      return [];
    } catch (error) {
      console.error('Ошибка при получении списка диалогов:', error);
      // В случае ошибки возвращаем пустой массив
      return [];
    }
  },

  /**
   * Получение конкретного диалога по ID
   * @param {number} id - ID диалога
   */
  getConversation: async (id) => {
    try {
      console.log(`Запрос диалога по ID: ${id}`);
      
      // Пробуем различные URL пути для получения диалога
      let response;
      try {
        // Сначала пробуем основной путь
        response = await api.get(`/chat/conversations/${id}/`);
      } catch (initialError) {
        console.warn(`Ошибка при запросе диалога ${id} по основному пути:`, initialError);
        
        try {
          // Пробуем альтернативный путь с /api
          console.log(`Пробуем альтернативный путь для диалога ${id} с /api/chat...`);
          response = await api.get(`/api/chat/conversations/${id}/`);
        } catch (apiError) {
          console.warn(`Ошибка при запросе диалога ${id} по альтернативному пути:`, apiError);
          
          // Если оба не работают, создаем прямой запрос с полным URL
          const token = localStorage.getItem('access_token');
          if (!token) {
            console.error('Отсутствует токен доступа для запроса диалога напрямую');
            throw new Error('Не удалось получить диалог: отсутствует токен авторизации');
          }
          
          // Пробуем прямой запрос через axios
          console.log(`Пробуем прямой запрос для диалога ${id} через axios...`);
          response = await axios.get(`/chat/conversations/${id}/`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
        }
      }
      
      console.log(`Получены данные диалога ${id}:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Ошибка при получении диалога ${id}:`, error);
      throw error; // Передаем ошибку для обработки в компоненте
    }
  },

  /**
   * Отправка сообщения в диалог (предпочитает WebSocket)
   * @param {number} conversationId - ID диалога
   * @param {string} content - Текст сообщения
   * @param {WebSocket} [webSocket] - WebSocket соединение (опционально)
   */
  sendMessage: async (conversationId, content, webSocket = null) => {
    // Пробуем отправить через WebSocket, если он передан и открыт
    if (webSocket && webSocket.readyState === WebSocket.OPEN) {
      try {
        console.log('Отправка сообщения через WebSocket:', content);
        webSocket.send(JSON.stringify({
          type: 'chat_message',
          message: content
        }));
        
        // Возвращаем временный объект, чтобы обеспечить совместимость с API
        return {
          content: content,
          timestamp: new Date().toISOString(),
          sent_via_websocket: true
        };
      } catch (wsError) {
        console.warn('Не удалось отправить через WebSocket:', wsError);
        // Продолжаем выполнение и используем HTTP fallback
      }
    }

    // Если WebSocket не работает, используем обычный HTTP запрос
    return chatService.sendMessageHttp(conversationId, content);
  },

  /**
   * Отправка сообщения в диалог только через HTTP (без WebSocket)
   * @param {number} conversationId - ID диалога
   * @param {string} content - Текст сообщения
   */
  sendMessageHttp: async (conversationId, content) => {
    try {
      console.log('Отправка сообщения через HTTP (чистый режим):', content);
      const response = await api.post(`/chat/conversations/${conversationId}/messages/`, {
        content
      });
      console.log('Успешный ответ от сервера при отправке сообщения:', response.data);
      return response.data;
    } catch (error) {
      console.error('Ошибка при HTTP отправке сообщения:', error);
      throw error;
    }
  },

  /**
   * Начать новый диалог для обсуждения аукциона
   * @param {number} carId - ID автомобиля (аукциона)
   */
  startConversation: async (carId) => {
    try {
      // Основной запрос через наш настроенный API клиент с правильным URL
      const apiUrl = `/chat/cars/${carId}/start-conversation/`;
      console.log(`Отправка запроса на создание диалога через api: ${apiUrl}`);
      
      try {
        // Сначала пробуем через основной API клиент
        const response = await api.post(apiUrl, {});
        console.log('Успешный ответ при создании диалога через api:', response);
        return response.data;
      } catch (apiError) {
        console.warn('Не удалось создать диалог через основной API клиент:', apiError);
        console.warn('Пробуем запасной вариант с полным URL...');
        
        // Альтернативные URL-пути
        const alternativeUrls = [
          `/api/chat/cars/${carId}/start-conversation/`,  // Основной формат с префиксом API
          `/chat/cars/${carId}/start-conversation/`       // Без префикса (обеспечивая обратную совместимость)
        ];
        
        // Получаем токен напрямую из localStorage
        const token = localStorage.getItem('access_token');
        console.log('Используем токен:', token ? token.substring(0, 20) + '...' : 'токен отсутствует');
        
        // Пробуем по очереди все URL-варианты
        for (const url of alternativeUrls) {
          try {
            console.log(`Пробуем запасной URL: ${url}`);
            const response = await axios.post(url, {}, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            console.log(`Успешный ответ при создании диалога по URL ${url}:`, response);
            return response.data;
          } catch (urlError) {
            console.warn(`Ошибка при использовании ${url}:`, urlError.message);
            // Продолжаем цикл, чтобы попробовать следующий URL
          }
        }
        
        // Если ни один из URL не сработал, выбрасываем исходную ошибку
        throw apiError;
      }
    } catch (error) {
      console.error('Ошибка при создании диалога в chatService:', error);
      console.error('Детали ошибки:', error.response ? error.response.data : 'Нет данных ответа');
      console.error('Код статуса:', error.response ? error.response.status : 'Нет кода статуса');
      throw error; // Передаем ошибку дальше для обработки в компоненте
    }
  },

  /**
   * Проверка соединения с чатом и статус сообщений
   * @param {number} conversationId - ID диалога
   */
  checkChatConnection: async (conversationId) => {
    try {
      const response = await api.get(`/chat/conversations/${conversationId}/status/`);
      return response.data;
    } catch (error) {
      console.error('Ошибка при проверке соединения чата:', error);
      return { connected: false };
    }
  }
};

export default chatService;