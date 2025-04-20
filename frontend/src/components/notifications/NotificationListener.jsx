import { useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import websocketManager from '../../utils/realTimeWebSocket';
import { 
  showOutbidNotification, 
  showAuctionWonNotification, 
  showAuctionEndedNotification 
} from '../../services/notificationService';

/**
 * Компонент, который прослушивает WebSocket для получения уведомлений
 * и обрабатывает их соответствующим образом
 */
const NotificationListener = () => {
  const { user, isAuthenticated } = useAuth();
  const processedNotifications = useRef(new Set()); // Для отслеживания обработанных уведомлений

  useEffect(() => {
    // Если пользователь не аутентифицирован, не устанавливаем соединение
    if (!isAuthenticated || !user) {
      return;
    }

    console.log('[NotificationListener] Setting up notification listener for user:', user.username);

    // Обработчик сообщений от WebSocket
    const handleMessage = (message) => {
      try {
        let data;
        
        // Разбираем сообщение из строки JSON если оно в виде строки
        if (typeof message === 'string') {
          try {
            data = JSON.parse(message);
          } catch (parseError) {
            console.warn('[NotificationListener] Failed to parse message as JSON:', message);
            console.error('[NotificationListener] Parse error:', parseError);
            return;
          }
        } else if (message instanceof Blob) {
          // Если это Blob, преобразуем его в строку и затем в JSON
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const jsonString = reader.result;
              const jsonData = JSON.parse(jsonString);
              processMessage(jsonData);
            } catch (error) {
              console.error('[NotificationListener] Error parsing Blob message:', error);
            }
          };
          reader.readAsText(message);
          return;
        } else if (message && typeof message === 'object') {
          // Если это уже объект, используем его напрямую
          data = message;
        } else {
          console.warn('[NotificationListener] Received unsupported message format:', typeof message);
          return;
        }
        
        // Проверяем валидность данных перед обработкой
        if (!data || typeof data !== 'object') {
          console.warn('[NotificationListener] Invalid message data format:', data);
          return;
        }
        
        // Обрабатываем сообщение
        processMessage(data);
      } catch (error) {
        console.error('[NotificationListener] Error processing message:', error);
      }
    };

    // Функция для обработки сообщения и отображения уведомления
    const processMessage = (data) => {
      // Проверяем наличие основных полей
      if (!data.type) {
        console.warn('[NotificationListener] Message missing required type field:', data);
        return;
      }
      
      // Проверяем, есть ли у сообщения уникальный идентификатор
      const notificationId = data.notification_id || 
                            `${data.type}_${data.car_id || 'unknown'}_${data.timestamp || Date.now()}`;
      
      // Если уведомление уже было обработано, пропускаем его
      if (processedNotifications.current.has(notificationId)) {
        console.log('[NotificationListener] Skipping duplicate notification:', notificationId);
        return;
      }
      
      // Добавляем уведомление в список обработанных
      processedNotifications.current.add(notificationId);
      
      // Ограничиваем размер множества обработанных уведомлений (не более 1000)
      if (processedNotifications.current.size > 1000) {
        const values = Array.from(processedNotifications.current);
        processedNotifications.current = new Set(values.slice(values.length - 500));
      }
      
      console.log('[NotificationListener] Processing notification:', data);
      
      // Проверяем, относится ли уведомление к текущему пользователю
      // Это особенно важно для уведомлений о ставках
      if (data.user_id && data.user_id !== user.id) {
        console.log(`[NotificationListener] Notification for different user (${data.user_id}), current user: ${user.id}`);
        return;
      }
      
      try {
        // Обрабатываем различные типы уведомлений
        switch (data.type) {
          case 'outbid':
            // Уведомление о перебитой ставке
            console.log('[NotificationListener] Received outbid notification:', data);
            // Проверяем наличие хотя бы минимальных данных для показа
            if (!data.car_id) {
              console.warn('[NotificationListener] Invalid outbid notification data:', data);
              return;
            }
            showOutbidNotification(data);
            break;
            
          case 'outbid_notification':
            // Новый тип уведомления о перебитой ставке от сервера
            console.log('[NotificationListener] Received outbid_notification:', data);
            if (!data.car_id) {
              console.warn('[NotificationListener] Invalid outbid_notification data:', data);
              return;
            }
            showOutbidNotification(data);
            break;
            
          case 'auction_won':
            // Уведомление о победе в аукционе
            if (!data.car_id || !data.final_price) {
              console.warn('[NotificationListener] Invalid auction_won notification data:', data);
              return;
            }
            showAuctionWonNotification(data);
            break;
            
          case 'auction_ended':
            // Уведомление о завершении аукциона (для продавца)
            if (!data.car_id) {
              console.warn('[NotificationListener] Invalid auction_ended notification data:', data);
              return;
            }
            showAuctionEndedNotification(data);
            break;
            
          case 'ping':
            // Пинг для поддержания соединения, просто логируем
            console.log('[NotificationListener] Received ping message');
            break;
            
          default:
            console.log('[NotificationListener] Unknown notification type:', data.type);
        }
      } catch (error) {
        console.error('[NotificationListener] Error handling notification:', error);
      }
    };

    // Статус соединения изменился
    const handleStatusChange = (status) => {
      console.log('[NotificationListener] WebSocket status changed:', status);
    };

    // Подключаемся к специальному endpoint для уведомлений
    const connection = websocketManager.connect(
      'notifications',
      handleMessage,
      handleStatusChange,
      {
        // Добавляем fallback paths в случае, если первичный путь недоступен
        fallbackPaths: ['auctions'],
        // Добавляем user_id для персонализированных уведомлений
        query: { user_id: user.id }
      }
    );
    
    // Подключаемся также к чат-уведомлениям
    const chatNotificationConnection = websocketManager.connect(
      'chat-notifications',
      handleMessage,
      handleStatusChange,
      {
        query: { user_id: user.id }
      }
    );

    // Очищаем соединения при размонтировании компонента
    return () => {
      if (connection) {
        console.log('[NotificationListener] Disconnecting notification WebSocket');
        connection.disconnect();
      }
      
      if (chatNotificationConnection) {
        console.log('[NotificationListener] Disconnecting chat notification WebSocket');
        chatNotificationConnection.disconnect();
      }
    };
  }, [isAuthenticated, user]);

  // Компонент не рендерит никаких элементов
  return null;
};

export default NotificationListener;