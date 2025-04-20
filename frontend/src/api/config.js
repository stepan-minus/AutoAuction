/**
 * API и WebSocket URL конфигурация
 * Обновленная версия с более детальными комментариями
 */

// Получаем API URL из переменных окружения или используем значение по умолчанию
// В разработке с Vite эти переменные будут доступны как import.meta.env.VITE_*
export const API_URL = import.meta.env.VITE_API_URL || '/api';

// База URL для WebSocket запросов
// Vite прокси настроен перенаправлять /ws/* на WebSocket серверa
export const WS_BASE_URL = import.meta.env.VITE_WS_URL || '/ws';

// Получение заголовков авторизации для API запросов
export const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Получение CSRF токена из cookie
export const getCSRFToken = () => {
  const csrfCookie = document.cookie.split(';').find(c => c.trim().startsWith('csrftoken='));
  if (csrfCookie) {
    return csrfCookie.split('=')[1];
  }
  return '';
};

// Проверка, авторизован ли пользователь
export const isAuthenticated = () => {
  return !!localStorage.getItem('access_token');
};

// Полный набор заголовков для API запросов, включая авторизацию и CSRF
export const getFullHeaders = (includeContentType = true) => {
  const headers = getAuthHeaders();
  const csrfToken = getCSRFToken();
  
  if (csrfToken) {
    headers['X-CSRFToken'] = csrfToken;
  }
  
  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }
  
  return headers;
};
