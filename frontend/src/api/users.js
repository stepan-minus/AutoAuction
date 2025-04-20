import axios from 'axios';
import api from '../services/api';

/**
 * Загрузка аватара пользователя
 * @param {File} file - файл изображения аватара
 * @param {string} token - JWT токен доступа
 * @returns {Promise} - результат запроса
 */
export const uploadAvatar = async (file, token) => {
  const formData = new FormData();
  formData.append('avatar', file);
  
  // Получаем CSRF-токен из cookie, если он есть
  function getCsrfToken() {
    const name = 'csrftoken=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookies = decodedCookie.split(';');
    
    for (let i = 0; i < cookies.length; i++) {
      let cookie = cookies[i].trim();
      if (cookie.indexOf(name) === 0) {
        return cookie.substring(name.length);
      }
    }
    return '';
  }
  
  const csrfToken = getCsrfToken();
  console.log('CSRF Token:', csrfToken ? csrfToken.substring(0, 10) + '...' : 'not found');
  
  // Создаем заголовки с CSRF-токеном
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'multipart/form-data',
  };
  
  // Добавляем X-CSRFToken заголовок, если токен найден
  if (csrfToken) {
    headers['X-CSRFToken'] = csrfToken;
  }
  
  // Используем правильный URL с префиксом /api/
  console.log('Отправка запроса на /api/users/profile/avatar/');
  return await axios.post('/api/users/profile/avatar/', formData, { headers });
};

/**
 * Удаление аватара пользователя
 * @param {string} token - JWT токен доступа
 * @returns {Promise} - результат запроса
 */
export const deleteAvatar = async (token) => {
  // Получаем CSRF-токен из cookie, если он есть
  function getCsrfToken() {
    const name = 'csrftoken=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookies = decodedCookie.split(';');
    
    for (let i = 0; i < cookies.length; i++) {
      let cookie = cookies[i].trim();
      if (cookie.indexOf(name) === 0) {
        return cookie.substring(name.length);
      }
    }
    return '';
  }
  
  const csrfToken = getCsrfToken();
  console.log('CSRF Token for delete:', csrfToken ? csrfToken.substring(0, 10) + '...' : 'not found');
  
  // Создаем заголовки с CSRF-токеном
  const headers = {
    'Authorization': `Bearer ${token}`
  };
  
  // Добавляем X-CSRFToken заголовок, если токен найден
  if (csrfToken) {
    headers['X-CSRFToken'] = csrfToken;
  }
  
  // Используем правильный URL с префиксом /api/
  console.log('Отправка запроса на удаление /api/users/profile/avatar/');
  return await axios.delete('/api/users/profile/avatar/', { headers });
};

/**
 * Получение профиля пользователя
 * @param {string} token - JWT токен доступа
 * @returns {Promise} - результат запроса
 */
export const getUserProfile = async (token) => {
  return axios.get(`/api/users/profile/`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
};

/**
 * Обновление профиля пользователя
 * @param {Object} userData - данные профиля для обновления
 * @param {string} token - JWT токен доступа
 * @returns {Promise} - результат запроса
 */
export const updateUserProfile = async (userData, token) => {
  return axios.put(`/api/users/profile/`, userData, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  });
};

/**
 * Получение профиля продавца по ID
 * @param {number} sellerId - ID продавца
 * @param {string} token - JWT токен доступа (опционально)
 * @returns {Promise} - результат запроса
 */
export const getSellerProfile = async (sellerId, token) => {
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  
  return axios.get(`/api/users/sellers/${sellerId}/`, {
    headers
  });
};