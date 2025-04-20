import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import NotificationToast from './NotificationToast';

const NotificationManager = () => {
  const [notifications, setNotifications] = useState([]);
  const location = useLocation();

  // Удаление уведомления по id
  const removeNotification = useCallback((id) => {
    setNotifications(prevNotifications => 
      prevNotifications.filter(notification => notification.id !== id)
    );
  }, []);

  // Добавление нового уведомления
  const addNotification = useCallback((notification) => {
    const id = Date.now();
    setNotifications(prevNotifications => [
      ...prevNotifications, 
      { ...notification, id }
    ]);
    
    // Автоматически удаляем уведомление через 7 секунд
    setTimeout(() => {
      removeNotification(id);
    }, 7000);
    
    return id;
  }, [removeNotification]);

  // Очистка всех уведомлений при смене страницы
  useEffect(() => {
    setNotifications([]);
  }, [location.pathname]);

  // Получение всех текущих уведомлений
  const getNotifications = useCallback(() => {
    return notifications;
  }, [notifications]);

  // Экспортируем методы в window для доступа из других компонентов
  useEffect(() => {
    window.notificationManager = {
      addNotification,
      removeNotification,
      getNotifications
    };

    return () => {
      delete window.notificationManager;
    };
  }, [addNotification, removeNotification, getNotifications]);

  return (
    <div className="notification-container">
      {notifications.map(notification => (
        <NotificationToast
          key={notification.id}
          onClose={removeNotification}
          {...notification}
        />
      ))}
    </div>
  );
};

export default NotificationManager;