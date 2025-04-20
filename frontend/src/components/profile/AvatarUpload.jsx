import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { uploadAvatar, deleteAvatar } from '../../api/users';
import { fixAvatarUrl, getUserAvatarUrl } from '../../utils/avatarHelper';

const AvatarUpload = ({ onAvatarUpdate }) => {
  const { user, authTokens, updateUserInfo } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  
  // Получить текущий аватар пользователя
  const getAvatarUrl = () => {
    // Используем общую утилиту для получения URL аватара
    return getUserAvatarUrl(user);
  };
  
  // Обработчик клика по аватару для выбора файла
  const handleAvatarClick = () => {
    fileInputRef.current.click();
  };
  
  // Загрузка выбранного файла на сервер
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Проверка типа файла (только изображения)
    if (!file.type.startsWith('image/')) {
      setError('Пожалуйста, выберите изображение.');
      return;
    }
    
    // Проверка размера файла (не более 5МБ)
    if (file.size > 5 * 1024 * 1024) {
      setError('Размер файла не должен превышать 5МБ.');
      return;
    }
    
    try {
      setIsUploading(true);
      setError(null);
      
      console.log('Загрузка файла:', file.name, 'размер:', (file.size / 1024).toFixed(2) + 'KB');
      
      // Использование функции из API
      const response = await uploadAvatar(file, authTokens?.access);
      
      // Если успешно, обновляем профиль пользователя
      if (response && response.status === 200) {
        // Получаем данные пользователя из ответа
        const userData = response.data;
        console.log('Ответ от сервера при загрузке аватара:', userData);
        
        // Обновляем контекст аутентификации, если есть данные профиля
        if (userData.profile) {
          updateUserInfo(userData);
        }
        
        // Вызываем колбэк при успешном обновлении
        if (typeof onAvatarUpdate === 'function') {
          // Пробуем найти URL аватара в разных местах ответа
          let avatarUrl = null;
          
          // Проверяем все возможные пути к аватару в ответе
          if (userData.avatar) {
            avatarUrl = userData.avatar;
          } else if (userData.profile && userData.profile.avatar) {
            avatarUrl = userData.profile.avatar;
          } else if (userData.profile && userData.profile.avatar_url) {
            avatarUrl = userData.profile.avatar_url;
          }
          
          console.log('Извлеченный URL аватара:', avatarUrl);
          
          // Исправляем URL если необходимо
          if (avatarUrl) {
            avatarUrl = fixAvatarUrl(avatarUrl);
            console.log('Исправленный URL аватара:', avatarUrl);
          }
          
          onAvatarUpdate(avatarUrl);
        }
      }
    } catch (err) {
      console.error('Ошибка при загрузке аватара:', err);
      
      // Более подробная информация об ошибке
      if (err.response) {
        console.error('Ответ сервера с ошибкой:', err.response.data);
        console.error('Статус ошибки:', err.response.status);
        setError(`Ошибка ${err.response.status}: ${err.response.data.error || 'Не удалось загрузить аватар'}`);
      } else if (err.request) {
        console.error('Запрос был отправлен, но ответа не получено');
        setError('Сервер не отвечает. Пожалуйста, попробуйте позже.');
      } else {
        console.error('Ошибка настройки запроса:', err.message);
        setError('Ошибка: ' + err.message);
      }
    } finally {
      setIsUploading(false);
    }
  };
  
  // Удаление текущего аватара
  const handleRemoveAvatar = async () => {
    try {
      setIsUploading(true);
      setError(null);
      
      console.log('Запрос на удаление аватара...');
      
      // Используем функцию из API
      const response = await deleteAvatar(authTokens?.access);
      
      // Если успешно, обновляем профиль пользователя
      if (response && response.status === 200) {
        // Получаем данные пользователя из ответа
        const userData = response.data;
        console.log('Ответ от сервера при удалении аватара:', userData);
        
        // Обновляем контекст аутентификации, если есть данные профиля
        if (userData) {
          updateUserInfo(userData);
        }
        
        // Вызываем колбэк при успешном обновлении
        if (typeof onAvatarUpdate === 'function') {
          onAvatarUpdate(null);
        }
      }
    } catch (err) {
      console.error('Ошибка при удалении аватара:', err);
      
      // Более подробная информация об ошибке
      if (err.response) {
        console.error('Ответ сервера с ошибкой:', err.response.data);
        console.error('Статус ошибки:', err.response.status);
        setError(`Ошибка ${err.response.status}: ${err.response.data.error || 'Не удалось удалить аватар'}`);
      } else if (err.request) {
        console.error('Запрос был отправлен, но ответа не получено');
        setError('Сервер не отвечает. Пожалуйста, попробуйте позже.');
      } else {
        console.error('Ошибка настройки запроса:', err.message);
        setError('Ошибка: ' + err.message);
      }
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <div className="avatar-upload-container">
      <div 
        className={`avatar-container ${isUploading ? 'uploading' : ''}`}
        onClick={handleAvatarClick}
      >
        <img 
          src={getAvatarUrl()} 
          alt="Avatar" 
          className="profile-avatar"
        />
        {isUploading && (
          <div className="uploading-overlay">
            <i className="fas fa-spinner fa-spin"></i>
          </div>
        )}
        <div className="avatar-overlay">
          <i className="fas fa-camera"></i>
          <span>Изменить</span>
        </div>
      </div>
      
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handleFileChange}
      />
      
      {(user?.profile?.avatar || user?.profile?.avatar_url) && (
        <button
          className="remove-avatar-button"
          onClick={handleRemoveAvatar}
          disabled={isUploading}
        >
          <i className="fas fa-trash-alt"></i> Удалить фото
        </button>
      )}
      
      {error && (
        <div className="avatar-error">
          {error}
        </div>
      )}
    </div>
  );
};

export default AvatarUpload;