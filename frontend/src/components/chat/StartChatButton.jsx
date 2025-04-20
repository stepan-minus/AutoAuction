import React, { useState } from 'react';
import { Button, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import chatService from '../../services/chatService';
import routes from '../../routes';

const StartChatButton = ({ carId, sellerId, variant = "primary", className = "", size = null, children }) => {
  const { user, isAuthenticated, authTokens } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Не показывать кнопку, если пользователь не авторизован или это его собственный лот
  if (!isAuthenticated || (user && user.id === sellerId)) {
    return null;
  }
  
  // Используем текст кнопки по умолчанию или переданный через children
  const buttonText = children || "Чат";

  const handleStartChat = async () => {
    // Предотвращаем повторные клики
    if (loading) return;
    
    // Проверяем наличие токенов
    if (!authTokens) {
      console.error('Отсутствуют токены авторизации');
      alert('Необходимо авторизоваться для отправки сообщений');
      navigate('/login');
      return;
    }

    setLoading(true);
    console.log('----- ДИАГНОСТИКА ЧАТА -----');
    console.log('Пользователь:', user);
    console.log('ID продавца:', sellerId);
    console.log('ID автомобиля:', carId);
    console.log('Токен:', authTokens.access.substring(0, 20) + '...');
    
    // Проверка на собственный лот (дополнительная защита)
    if (user && user.id === sellerId) {
      console.warn('Попытка создать диалог с самим собой!');
      alert('Нельзя создать диалог со своим собственным лотом');
      setLoading(false);
      return;
    }
    
    try {
      // Сохраняем важную информацию в sessionStorage
      sessionStorage.setItem('redirecting_to_chat', 'true');
      sessionStorage.setItem('current_car_id', carId);
      
      // Сначала проверим, есть ли уже существующие диалоги по этому автомобилю (опционально)
      // Этот шаг может быть пропущен, так как бэкенд сам проверяет наличие диалогов
      
      console.log('Вызываем chatService.startConversation с ID:', carId);
      
      // Получаем диалог от сервера с повышенной устойчивостью к ошибкам
      let response;
      try {
        response = await chatService.startConversation(carId);
      } catch (initialError) {
        console.warn('Первичная ошибка при создании диалога:', initialError);
        // Попытка повторить запрос с небольшой задержкой (может помочь при временных проблемах)
        await new Promise(resolve => setTimeout(resolve, 500));
        response = await chatService.startConversation(carId);
      }
      
      console.log('Получен ответ от сервера:', response);
      
      // Проверяем что получили корректный ответ с ID диалога
      if (response && response.id) {
        console.log(`Перенаправление на страницу диалога: /messages/${response.id}`);
        
        // Сохраняем ID диалога в sessionStorage
        sessionStorage.setItem('last_conversation_id', response.id);
        
        // Переход на страницу диалога
        navigate(`/messages/${response.id}`);
      } else {
        console.log('ID диалога не получен, перенаправление на список диалогов');
        setLoading(false);
        navigate(routes.conversations);
      }
    } catch (error) {
      console.error('Ошибка при создании диалога:', error);
      console.error('Детали ошибки:', error.response ? error.response.data : 'Нет данных ответа');
      
      // Анализ ошибки для более информативного сообщения
      let errorMessage = 'Не удалось создать диалог. Пожалуйста, попробуйте позже.';
      
      if (error.response) {
        const status = error.response.status;
        const responseData = error.response.data;
        
        console.log(`Статус ошибки: ${status}, данные:`, responseData);
        
        // Обрабатываем различные коды ошибок
        if (status === 404) {
          // Фиксированная обработка для ошибок "не найден"
          console.log("Попытка автоматического исправления ошибки 404...");
          
          try {
            // Прямая попытка перейти на страницу диалогов вместо создания нового
            navigate(routes.conversations);
            return; // Прекращаем выполнение после навигации
          } catch (navError) {
            console.error("Ошибка при перенаправлении:", navError);
            errorMessage = 'Сервер не смог найти нужные данные. Перейдите к диалогам вручную.';
          }
        } else if (status === 403) {
          errorMessage = 'У вас нет прав для создания этого диалога.';
        } else if (status === 400) {
          if (responseData && responseData.error) {
            errorMessage = responseData.error;
          } else {
            errorMessage = 'Неверный запрос при создании диалога.';
          }
        } else if (status === 500) {
          errorMessage = 'Произошла внутренняя ошибка сервера. Попробуйте позже.';
        }
      }
      
      // Показываем пользователю сообщение об ошибке
      alert(errorMessage);
      setLoading(false);
    }
  };

  return (
    <Button 
      variant={variant}
      className={`d-flex align-items-center ${className}`}
      onClick={handleStartChat}
      disabled={loading}
      size={size}
    >
      {loading ? (
        <Spinner animation="border" size="sm" className="me-1" style={{ fontSize: '0.7rem' }} />
      ) : (
        <i className="bi bi-chat-dots me-1" style={{ fontSize: '0.7rem' }}></i>
      )}
      <span style={{ fontSize: '0.7rem' }}>{buttonText}</span>
    </Button>
  );
};

export default StartChatButton;