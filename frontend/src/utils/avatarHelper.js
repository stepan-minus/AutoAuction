/**
 * Утилиты для работы с аватарами пользователей
 */

const defaultAvatar = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png';

/**
 * Преобразует различные форматы URL в корректные для текущего домена
 * @param {string} path - Путь к файлу (относительный или абсолютный)
 * @returns {string} - Корректный URL для текущего домена
 */
const getCorrectMediaUrl = (path) => {
  // Если путь не определен, возвращаем дефолтное изображение
  if (!path) return defaultAvatar;
  
  // Сначала выведем данные для отладки
  console.log('Обработка URL аватара:', path);
  
  try {
    // Уже полный URL
    if (path.startsWith('http')) {
      // Проверяем на локальную разработку
      if (path.includes('0.0.0.0:5000')) {
        // Получаем только путь без домена
        const pathOnly = path.replace(/https?:\/\/0\.0\.0\.0:5000/i, '');
        // Добавляем текущий домен
        const correctUrl = `${window.location.origin}${pathOnly}`;
        console.log('Преобразование URL локальной разработки:', path, '->', correctUrl);
        return correctUrl;
      }
      
      // Проверяем на другие локальные IP-адреса (127.0.0.1)
      if (path.includes('127.0.0.1:5000')) {
        const pathOnly = path.replace(/https?:\/\/127\.0\.0\.1:5000/i, '');
        const correctUrl = `${window.location.origin}${pathOnly}`;
        console.log('Преобразование локального IP:', path, '->', correctUrl);
        return correctUrl;
      }
      
      console.log('URL уже в полном формате:', path);
      return path;
    }
    
    // Если URL содержит media без api/ в начале, добавляем /api
    if (path.startsWith('/media/')) {
      // Проверяем, не содержит ли URL уже /api/ в начале
      if (path.includes('/api/media/')) {
        return path.startsWith('http') ? path : `${window.location.origin}${path}`;
      }
      const correctUrl = `${window.location.origin}/api${path}`;
      console.log('Добавление /api к медиа URL:', path, '->', correctUrl);
      return correctUrl;
    }
    
    // Относительный путь - добавляем домен
    if (path.startsWith('/')) {
      const correctUrl = `${window.location.origin}${path}`;
      console.log('Относительный путь с /', path, '->', correctUrl);
      return correctUrl;
    }
    
    // Путь без слеша в начале
    const correctUrl = `${window.location.origin}/${path}`;
    console.log('Путь без / в начале:', path, '->', correctUrl);
    return correctUrl;
  } catch (error) {
    console.error('Ошибка при обработке URL аватара:', error, 'для пути:', path);
    // В случае ошибки возвращаем дефолтное изображение
    return defaultAvatar;
  }
};

/**
 * Исправляет URL с 0.0.0.0:5000 на относительные пути API
 * Совместимость с предыдущей версией fixAvatarUrl из компонента AvatarUpload
 * @param {string} url - Исходный URL аватара
 * @returns {string} - Исправленный URL
 */
export const fixAvatarUrl = (url) => {
  console.log('fixAvatarUrl: получили URL:', url);
  
  if (!url) {
    console.log('fixAvatarUrl: URL пустой, возвращаем дефолтный аватар');
    return defaultAvatar;
  }
  
  // Проверяем, содержит ли URL уже /api/media
  if (url.includes('/api/media/')) {
    // URL уже в правильном формате, просто добавляем домен если нужно
    if (!url.startsWith('http')) {
      const fullUrl = `${window.location.origin}${url}`;
      console.log('fixAvatarUrl: Добавление домена к API URL:', url, '->', fullUrl);
      return fullUrl;
    }
    console.log('fixAvatarUrl: URL уже содержит /api/media и имеет домен:', url);
    return url;
  }
  
  // Если URL содержит локальные адреса, заменяем на относительный путь
  if (url.includes('0.0.0.0:5000')) {
    const path = url.split('0.0.0.0:5000')[1];
    const fixedUrl = `/api${path}`;
    console.log('fixAvatarUrl: Исправление URL для 0.0.0.0:', url, '->', fixedUrl);
    return fixedUrl;
  }
  
  // Обработка 127.0.0.1
  if (url.includes('127.0.0.1:5000')) {
    const path = url.split('127.0.0.1:5000')[1];
    const fixedUrl = `/api${path}`;
    console.log('fixAvatarUrl: Исправление URL для 127.0.0.1:', url, '->', fixedUrl);
    return fixedUrl;
  }
  
  // Обработка localhost
  if (url.includes('localhost:5000')) {
    const path = url.split('localhost:5000')[1];
    const fixedUrl = `/api${path}`;
    console.log('fixAvatarUrl: Исправление URL для localhost:', url, '->', fixedUrl);
    return fixedUrl;
  }
  
  // Обработка простого пути /media/
  if (url.startsWith('/media/')) {
    const fixedUrl = `${window.location.origin}/api${url}`;
    console.log('fixAvatarUrl: Добавление /api к пути /media/:', url, '->', fixedUrl);
    return fixedUrl;
  }
  
  const correctUrl = getCorrectMediaUrl(url);
  console.log('fixAvatarUrl: Использование getCorrectMediaUrl для:', url, '->', correctUrl);
  return correctUrl;
};

/**
 * Возвращает URL аватара пользователя или дефолтное изображение
 * @param {Object} user - Объект пользователя
 * @returns {string} URL изображения аватара
 */
export const getUserAvatarUrl = (user) => {
  if (!user) {
    return defaultAvatar;
  }
  
  // 1. Проверяем аватар в корне объекта
  if (user.avatar_url) {
    return getCorrectMediaUrl(user.avatar_url);
  }
  
  if (user.avatar) {
    return getCorrectMediaUrl(user.avatar);
  }
  
  // 2. Проверяем аватар в профиле
  if (user.profile) {
    if (user.profile.avatar_url) {
      return getCorrectMediaUrl(user.profile.avatar_url);
    }
    
    if (user.profile.avatar) {
      return getCorrectMediaUrl(user.profile.avatar);
    }
  }
  
  // 3. Если мы здесь - ничего не нашли
  return defaultAvatar;
};

/**
 * Обработчик ошибок при загрузке изображений аватаров
 * @param {Event} event - Событие ошибки загрузки изображения
 */
export const handleAvatarError = (event) => {
  event.target.src = defaultAvatar;
};