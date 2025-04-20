import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getUserProfile, updateUserProfile, getUserAuctionHistory } from '../api/user';
import { getCars, deleteCarAuction } from '../api/auction';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';
import { validateProfileForm, validatePasswordForm } from '../utils/validate';
import { formatCurrency, formatDate } from '../utils/formatDate';
import { changePassword } from '../api/auth';
import StarRating from '../components/StarRating';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import AvatarUpload from '../components/profile/AvatarUpload';
import StartChatButton from '../components/chat/StartChatButton';
import EmailVerificationForm from '../components/profile/EmailVerificationForm';
import Timer from '../components/Timer';

const ProfilePage = () => {
  const { user, updateUserInfo } = useAuth();
  
  // Profile data
  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    profile: {
      bio: '',
      phone: ''
    }
  });
  
  // Password change
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });
  
  // User's auction activity
  const [userCars, setUserCars] = useState([]);
  const [auctionHistory, setAuctionHistory] = useState([]);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [errors, setErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const [auctionMessage, setAuctionMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Состояние для модального окна подтверждения удаления
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [auctionToDelete, setAuctionToDelete] = useState(null);
  
  // Load user profile data
  useEffect(() => {
    const loadProfileData = async () => {
      setLoading(true);
      
      try {
        const userData = await getUserProfile();
        
        // Format profile data
        setProfileData({
          username: userData.username || '',
          email: userData.email || '',
          first_name: userData.first_name || '',
          last_name: userData.last_name || '',
          profile: {
            bio: userData.profile?.bio || '',
            phone: userData.profile?.phone || ''
          }
        });
        
        // Load user's auctions and history
        const [carsResponse, historyResponse] = await Promise.all([
          getCars(),
          getUserAuctionHistory()
        ]);
        
        // Filter user's cars from all cars
        const userCarsList = carsResponse.results.filter(
          car => car.seller && car.seller.id === userData.id
        );
        
        setUserCars(userCarsList);
        setAuctionHistory(historyResponse);
      } catch (err) {
        console.error('Error loading profile data:', err);
        setErrors({ general: 'Не удалось загрузить данные профиля. Пожалуйста, попробуйте еще раз.' });
      } finally {
        setLoading(false);
      }
    };
    
    loadProfileData();
  }, []);
  

  
  // Handle profile form changes
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    
    // Clear success message when user makes changes
    if (successMessage) {
      setSuccessMessage('');
    }
    
    // Handle nested profile fields
    if (name.startsWith('profile.')) {
      const profileField = name.split('.')[1];
      setProfileData(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          [profileField]: value
        }
      }));
    } else {
      setProfileData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // Handle password form changes
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    
    // Clear success message when user makes changes
    if (passwordSuccess) {
      setPasswordSuccess('');
    }
    
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (passwordErrors[name]) {
      setPasswordErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // Save profile changes
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const validationErrors = validateProfileForm(profileData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setSaving(true);
    setErrors({});
    setSuccessMessage('');
    
    try {
      const response = await updateUserProfile(profileData);
      
      // Update user info in context
      updateUserInfo(response);
      
      setSuccessMessage('Профиль успешно обновлен');
    } catch (err) {
      console.error('Error updating profile:', err);
      setErrors({ 
        general: err.message || 'Не удалось обновить профиль. Пожалуйста, попробуйте еще раз.' 
      });
    } finally {
      setSaving(false);
    }
  };
  
  // Change password
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    // Validate password form
    const validationErrors = validatePasswordForm(passwordData);
    if (Object.keys(validationErrors).length > 0) {
      setPasswordErrors(validationErrors);
      return;
    }
    
    setChangingPassword(true);
    setPasswordErrors({});
    setPasswordSuccess('');
    
    try {
      await changePassword(passwordData.old_password, passwordData.new_password);
      
      // Clear password form
      setPasswordData({
        old_password: '',
        new_password: '',
        confirm_password: ''
      });
      
      setPasswordSuccess('Пароль успешно изменен');
    } catch (err) {
      console.error('Error changing password:', err);
      setPasswordErrors({ 
        general: err.message || 'Не удалось изменить пароль. Пожалуйста, попробуйте еще раз.' 
      });
    } finally {
      setChangingPassword(false);
    }
  };
  
  // Открыть модальное окно подтверждения удаления
  const openDeleteConfirmation = (auction) => {
    setAuctionToDelete(auction);
    setDeleteModalOpen(true);
  };
  
  // Закрыть модальное окно подтверждения без удаления
  const closeDeleteConfirmation = () => {
    setDeleteModalOpen(false);
    setAuctionToDelete(null);
  };

  // Удаление аукциона
  const handleDeleteAuction = async () => {
    if (!auctionToDelete) return;
    
    setIsDeleting(true);
    setAuctionMessage('');
    
    try {
      await deleteCarAuction(auctionToDelete.id);
      
      // Обновляем список аукционов пользователя, удаляя удаленный аукцион
      setUserCars(prevCars => prevCars.filter(car => car.id !== auctionToDelete.id));
      
      // Выводим сообщение об успешном удалении
      setAuctionMessage('Аукцион успешно удален');
      
      // Очищаем сообщение через 5 секунд
      setTimeout(() => {
        setAuctionMessage('');
      }, 5000);
      
      // Закрываем модальное окно
      closeDeleteConfirmation();
    } catch (err) {
      console.error('Ошибка при удалении аукциона:', err);
      setAuctionMessage(`Ошибка: ${err.message || 'Не удалось удалить аукцион'}`);
    } finally {
      setIsDeleting(false);
    }
  };
  
  if (loading) {
    return <Loader size="large" text="Загрузка профиля..." />;
  }
  
  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <h1>Мой профиль</h1>
          
          <div className="profile-tabs">
            <button 
              className={`profile-tab ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <i className="fas fa-user"></i>
              Информация профиля
            </button>
            <button 
              className={`profile-tab ${activeTab === 'password' ? 'active' : ''}`}
              onClick={() => setActiveTab('password')}
            >
              <i className="fas fa-lock"></i>
              Изменить пароль
            </button>
            <button 
              className={`profile-tab ${activeTab === 'auctions' ? 'active' : ''}`}
              onClick={() => setActiveTab('auctions')}
            >
              <i className="fas fa-gavel"></i>
              Мои аукционы
            </button>
            <button 
              className={`profile-tab ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <i className="fas fa-history"></i>
              История аукционов
            </button>
          </div>
        </div>
        
        <div className="profile-content">
          {/* Profile Information Tab */}
          {activeTab === 'profile' && (
            <div className="profile-form-container">
              <h2>Редактировать профиль</h2>
              
              {errors.general && (
                <div className="error-message general-error">{errors.general}</div>
              )}
              
              {successMessage && (
                <div className="success-message">{successMessage}</div>
              )}
              
              {/* Компонент загрузки аватара */}
              <div className="avatar-section">
                <h3>Фото профиля</h3>
                <AvatarUpload onAvatarUpdate={() => {}} />
              </div>
              
              <form onSubmit={handleProfileSubmit} className="profile-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="first_name">Имя</label>
                    <input
                      type="text"
                      id="first_name"
                      name="first_name"
                      value={profileData.first_name}
                      onChange={handleProfileChange}
                      placeholder="Введите ваше имя"
                    />
                    {errors.first_name && (
                      <div className="error-message">{errors.first_name}</div>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="last_name">Фамилия</label>
                    <input
                      type="text"
                      id="last_name"
                      name="last_name"
                      value={profileData.last_name}
                      onChange={handleProfileChange}
                      placeholder="Введите вашу фамилию"
                    />
                    {errors.last_name && (
                      <div className="error-message">{errors.last_name}</div>
                    )}
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="username">Имя пользователя</label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={profileData.username}
                    onChange={handleProfileChange}
                    placeholder="Введите имя пользователя"
                  />
                  {errors.username && (
                    <div className="error-message">{errors.username}</div>
                  )}
                </div>
                
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={profileData.email}
                    readOnly
                    className="read-only"
                  />
                  <small className="form-hint">Email нельзя изменить</small>
                </div>
                
                {/* Компонент верификации email */}
                <EmailVerificationForm onVerificationComplete={() => {
                  setSuccessMessage('Email успешно подтвержден!');
                  // Запрашиваем обновленные данные профиля
                  getUserProfile().then(userData => {
                    updateUserInfo(userData);
                  });
                }} />
                
                <button 
                  type="submit" 
                  className="submit-button"
                  disabled={saving}
                >
                  {saving ? 'Сохраняется...' : 'Сохранить изменения'}
                </button>
              </form>
            </div>
          )}
          
          {/* Change Password Tab */}
          {activeTab === 'password' && (
            <div className="password-form-container">
              <h2>Изменить пароль</h2>
              
              {passwordErrors.general && (
                <div className="error-message general-error">{passwordErrors.general}</div>
              )}
              
              {passwordSuccess && (
                <div className="success-message">{passwordSuccess}</div>
              )}
              
              <form onSubmit={handlePasswordSubmit} className="password-form">
                <div className="form-group">
                  <label htmlFor="old_password">Текущий пароль</label>
                  <input
                    type="password"
                    id="old_password"
                    name="old_password"
                    value={passwordData.old_password}
                    onChange={handlePasswordChange}
                    placeholder="Введите текущий пароль"
                    required
                  />
                  {passwordErrors.old_password && (
                    <div className="error-message">{passwordErrors.old_password}</div>
                  )}
                </div>
                
                <div className="form-group">
                  <label htmlFor="new_password">Новый пароль</label>
                  <input
                    type="password"
                    id="new_password"
                    name="new_password"
                    value={passwordData.new_password}
                    onChange={handlePasswordChange}
                    placeholder="Введите новый пароль"
                    required
                  />
                  {passwordErrors.new_password && (
                    <div className="error-message">{passwordErrors.new_password}</div>
                  )}
                  <small className="form-hint">Пароль должен содержать минимум 8 символов</small>
                </div>
                
                <div className="form-group">
                  <label htmlFor="confirm_password">Подтвердите новый пароль</label>
                  <input
                    type="password"
                    id="confirm_password"
                    name="confirm_password"
                    value={passwordData.confirm_password}
                    onChange={handlePasswordChange}
                    placeholder="Подтвердите новый пароль"
                    required
                  />
                  {passwordErrors.confirm_password && (
                    <div className="error-message">{passwordErrors.confirm_password}</div>
                  )}
                </div>
                
                <div className="password-form-actions">
                  <button 
                    type="submit" 
                    className="password-submit-button"
                    disabled={changingPassword}
                  >
                    {changingPassword ? 'Изменение пароля...' : 'Изменить пароль'}
                  </button>
                </div>
              </form>
            </div>
          )}
          
          {/* My Auctions Tab */}
          {activeTab === 'auctions' && (
            <div className="my-auctions-container">
              <h2>Мои аукционы</h2>
              
              {auctionMessage && (
                <div className="success-message auction-message">{auctionMessage}</div>
              )}
              
              <div className="auction-actions">
                <Link to="/create-auction" className="create-auction-button">
                  <i className="fas fa-plus"></i> Создать новый аукцион
                </Link>
              </div>
              
              {userCars.length > 0 ? (
                <div className="auction-grid">
                  {userCars.map(car => (
                    <div key={car.id} className="auction-card profile-auction-card">
                      <Link to={`/auction/${car.id}`} className="auction-card-link">
                        <div className="card-image">
                          {car.image_url || car.image ? (
                            <img 
                              src={(car.image_url || car.image).includes && (car.image_url || car.image).includes('0.0.0.0') 
                                ? `/media/${(car.image_url || car.image).split('/media/')[1]}`
                                : (car.image_url || car.image)} 
                              alt={`${car.brand} ${car.model}`} 
                            />
                          ) : (
                            <div className="no-image">
                              <i className="fas fa-car"></i>
                            </div>
                          )}
                          
                          <span className={`status-badge status-${car.status}`}>
                            {car.status === 'active' ? 'Активен' : 
                             car.status === 'pending' ? 'Ожидает' : 
                             car.status === 'completed' ? 'Завершен' : 
                             car.status === 'cancelled' ? 'Отменен' : 
                             car.status.charAt(0).toUpperCase() + car.status.slice(1)}
                          </span>
                        </div>
                        
                        <div className="card-content">
                          <h3 className="car-title">{car.brand} {car.model} ({car.year})</h3>
                          
                          <div className="price-section">
                            <span className="current-price">{formatCurrency(car.current_price || car.starting_price)}</span>
                            <span className="bid-count">
                              {car.bid_count || 0} ставк{car.bid_count === 1 ? 'а' : car.bid_count >= 2 && car.bid_count <= 4 ? 'и' : 'ок'}
                            </span>
                          </div>
                          
                          {car.status === 'active' && car.end_time && (
                            <div className="timer-container">
                              <Timer 
                                endTime={car.end_time} 
                                timeRemaining={Math.max(0, Math.floor((new Date(car.end_time) - new Date()) / 1000))} 
                              />
                            </div>
                          )}
                        </div>
                      </Link>
                      
                      {car.status === 'pending' && (
                        <button 
                          onClick={() => openDeleteConfirmation(car)} 
                          className="delete-button"
                        >
                          <i className="fas fa-trash"></i> Удалить
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-auctions">
                  <p>Вы еще не создали ни одного аукциона.</p>
                  <Link to="/create-auction" className="create-auction-link">
                    Создать первый аукцион
                  </Link>
                </div>
              )}
            </div>
          )}
          
          {/* Auction History Tab */}
          {activeTab === 'history' && (
            <div className="auction-history-container">
              <h2>История аукционов</h2>
              
              {auctionHistory.length > 0 ? (
                <div className="history-list">
                  {auctionHistory.map(history => (
                    <div key={history.id} className="history-item">
                      <div className="history-header">
                        <h3 className="car-name">
                          <Link to={`/auction/${history.car}`}>
                            {history.car_details && history.car_details.brand 
                              ? `${history.car_details.brand} ${history.car_details.model} (${history.car_details.year})`
                              : `Автомобиль #${history.car}`
                            }
                          </Link>
                        </h3>
                        
                        <span className="final-price">
                          Итоговая цена: {formatCurrency(history.final_price)}
                        </span>
                      </div>
                      
                      <div className="history-details">
                        <span className="winner">
                          Победитель: {history.winner ? history.winner.username : 'Нет победителя'}
                          {history.winner && history.winner.id === user.id && (
                            <span className="you-won"> (Вы)</span>
                          )}
                        </span>
                        
                        <span className="end-date">
                          Завершен: {formatDate(history.ended_at)}
                        </span>
                        
                        <div className="history-actions">
                          {/* Кнопка просмотра аукциона - всегда показывается */}
                          <Link to={`/auction/${history.car}`} className="view-auction-link">
                            Просмотр деталей
                          </Link>
                          
                          {/* Кнопка чата с победителем (для продавца) */}
                          {history.winner && 
                           history.car_details && history.car_details.seller && 
                           history.car_details.seller.id === user.id && (
                            <StartChatButton 
                              carId={history.car} 
                              sellerId={history.winner.id} 
                              variant="outline-primary" 
                              size="sm"
                              className="ms-2"
                            >
                              Чат с победителем
                            </StartChatButton>
                          )}
                          
                          {/* Кнопка чата с продавцом (для обычного пользователя) */}
                          {history.winner && history.winner.id === user.id && 
                           history.car_details && history.car_details.seller && (
                            <StartChatButton 
                              carId={history.car} 
                              sellerId={history.car_details.seller.id} 
                              variant="outline-primary" 
                              size="sm"
                              className="ms-2"
                            >
                              Чат с продавцом
                            </StartChatButton>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-history">
                  <p>У вас пока нет истории аукционов.</p>
                  <p>Участвуйте в аукционах, чтобы увидеть здесь вашу историю.</p>
                </div>
              )}
            </div>
          )}
          


        </div>
      </div>
      
      {/* Модальное окно подтверждения удаления */}
      <DeleteConfirmationModal 
        isOpen={deleteModalOpen}
        onClose={closeDeleteConfirmation}
        onConfirm={handleDeleteAuction}
        auctionTitle={auctionToDelete ? `${auctionToDelete.brand} ${auctionToDelete.model} (${auctionToDelete.year})` : ''}
      />
    </div>
  );
};

export default ProfilePage;
