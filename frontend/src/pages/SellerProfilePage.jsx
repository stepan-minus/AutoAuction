import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSellerProfile, submitSellerReview, updateSellerReview, deleteSellerReview } from '../api/user';
import { getCars } from '../api/auction';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';
import StartChatButton from '../components/chat/StartChatButton';
import { formatDate } from '../utils/formatDate';
import StarRating from '../components/StarRating';
import Timer from '../components/Timer';

// Функция для обработки URL изображений
const processImageUrl = (url) => {
  if (!url) return 'https://via.placeholder.com/300x200?text=No+Image';
  
  // Если URL относительный, используем его как есть
  if (url.startsWith('/')) {
    return url;
  } 
  // Если URL содержит 0.0.0.0 или localhost, преобразуем в относительный путь
  else if (url.includes('0.0.0.0') || url.includes('localhost')) {
    const mediaPathMatch = url.split('/media/');
    if (mediaPathMatch.length > 1) {
      return `/media/${mediaPathMatch[1]}`;
    }
  }
  
  // Иначе используем URL как есть
  return url;
};

const SellerProfilePage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  
  // Состояния
  const [seller, setSeller] = useState(null);
  const [sellerCars, setSellerCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Состояние для формы отзыва
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: ''
  });
  const [reviewErrors, setReviewErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [editingReviewId, setEditingReviewId] = useState(null);
  
  // Получение данных при монтировании компонента
  useEffect(() => {
    const loadSellerData = async () => {
      try {
        setLoading(true);
        
        // Загрузка профиля продавца
        const sellerData = await getSellerProfile(id);
        setSeller(sellerData);
        
        // Загрузка аукционов продавца
        const carsResponse = await getCars();
        // Фильтруем только автомобили текущего продавца
        const sellerCarsList = carsResponse.results.filter(
          car => car.seller && car.seller.id === parseInt(id)
        );
        setSellerCars(sellerCarsList);
        
      } catch (err) {
        console.error('Ошибка загрузки данных продавца:', err);
        setError('Не удалось загрузить информацию о продавце. Пожалуйста, попробуйте ещё раз.');
      } finally {
        setLoading(false);
      }
    };
    
    loadSellerData();
  }, [id]);
  
  // Обработка отправки отзыва
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    
    // Валидация
    const errors = {};
    if (reviewForm.rating < 1 || reviewForm.rating > 5) {
      errors.rating = 'Рейтинг должен быть от 1 до 5';
    }
    if (!reviewForm.comment.trim()) {
      errors.comment = 'Пожалуйста, оставьте комментарий';
    } else if (reviewForm.comment.length < 5) {
      errors.comment = 'Комментарий должен содержать как минимум 5 символов';
    }
    
    if (Object.keys(errors).length > 0) {
      setReviewErrors(errors);
      return;
    }
    
    setIsSubmitting(true);
    setReviewErrors({});
    
    try {
      if (editingReviewId) {
        // Обновление существующего отзыва
        await updateSellerReview(id, editingReviewId, reviewForm);
        setSuccessMessage('Ваш отзыв успешно обновлен');
        setEditingReviewId(null);
      } else {
        // Создание нового отзыва
        await submitSellerReview(id, reviewForm);
        setSuccessMessage('Ваш отзыв успешно отправлен');
      }
      
      // Перезагрузить данные продавца для обновления отзывов и рейтинга
      const updatedSellerData = await getSellerProfile(id);
      setSeller(updatedSellerData);
      
      // Сбросить форму
      setReviewForm({
        rating: 5,
        comment: ''
      });
      
    } catch (err) {
      console.error('Ошибка при отправке отзыва:', err);
      setReviewErrors({ general: err.message || 'Не удалось отправить отзыв. Пожалуйста, попробуйте ещё раз.' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Обработка изменения поля отзыва
  const handleReviewChange = (e) => {
    const { name, value } = e.target;
    setReviewForm(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Очистить сообщение об успехе при изменении формы
    if (successMessage) {
      setSuccessMessage('');
    }
  };
  
  // Обработка изменения рейтинга
  const handleRatingChange = (newRating) => {
    setReviewForm(prev => ({
      ...prev,
      rating: newRating
    }));
  };
  
  // Начать редактирование отзыва
  const handleEditReview = (review) => {
    setReviewForm({
      rating: review.rating,
      comment: review.comment
    });
    setEditingReviewId(review.id);
    
    // Прокрутить к форме отзыва
    document.getElementById('review-form').scrollIntoView({ behavior: 'smooth' });
  };
  
  // Удалить отзыв
  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот отзыв?')) {
      return;
    }
    
    try {
      await deleteSellerReview(id, reviewId);
      
      // Обновить данные продавца
      const updatedSellerData = await getSellerProfile(id);
      setSeller(updatedSellerData);
      
      setSuccessMessage('Отзыв успешно удален');
    } catch (err) {
      console.error('Ошибка при удалении отзыва:', err);
      setReviewErrors({ general: err.message || 'Не удалось удалить отзыв. Пожалуйста, попробуйте ещё раз.' });
    }
  };
  
  // Отмена редактирования отзыва
  const handleCancelEdit = () => {
    setEditingReviewId(null);
    setReviewForm({
      rating: 5,
      comment: ''
    });
  };
  
  if (loading) {
    return <Loader size="large" text="Загрузка профиля продавца..." />;
  }
  
  if (error || !seller) {
    return (
      <div className="error-container">
        <h2>Ошибка</h2>
        <p>{error || 'Продавец не найден'}</p>
        <Link to="/" className="cancel-button">
          Вернуться на главную
        </Link>
      </div>
    );
  }
  
  // Проверка, является ли текущий пользователь владельцем профиля
  const isOwner = user && user.id === parseInt(id);
  
  // Проверка, оставлял ли текущий пользователь отзыв
  const userReview = user && seller.reviews.find(review => review.reviewer_id === user.id);
  
  return (
    <div className="seller-profile-page">
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        {/* Основная информация о продавце - новый компактный дизайн */}
        <div className="seller-profile-container">
          <div className="seller-profile-card">
            <div className="seller-profile-left">
              <div className="seller-avatar">
                <img 
                  src={processImageUrl(seller.profile.avatar_url) || 'https://via.placeholder.com/120x120?text=Avatar'} 
                  alt={`${seller.username} avatar`}
                />
              </div>
              
              <div className="seller-quick-stats">
                <div className="seller-rating-large">
                  <StarRating 
                    value={parseFloat(seller.profile.rating) || 0} 
                    readOnly={true}
                    size="large"
                  />
                  <span className="rating-number">{(parseFloat(seller.profile.rating) || 0).toFixed(1)}</span>
                </div>
              </div>
              
              {!isOwner && user && sellerCars.length > 0 && (
                <div className="seller-contact-actions">
                  <StartChatButton 
                    carId={sellerCars[0].id} 
                    sellerId={parseInt(id)}
                    size="md"
                    variant="primary"
                    className="contact-button"
                  />
                </div>
              )}
            </div>
            
            <div className="seller-profile-right">
              <div className="seller-profile-header">
                <h1 className="seller-name">{seller.username}</h1>
                {seller.profile.rating_count > 5 && (
                  <span className="verified-badge">
                    <i className="fas fa-check-circle"></i> Проверенный продавец
                  </span>
                )}
              </div>
              
              <div className="seller-details-grid">
                <div className="seller-detail">
                  <i className="fas fa-user"></i>
                  <span>
                    {seller.first_name && seller.last_name 
                      ? `${seller.first_name} ${seller.last_name}` 
                      : 'Не указано'
                    }
                  </span>
                </div>
                <div className="seller-detail">
                  <i className="fas fa-calendar-alt"></i>
                  <span>Регистрация: {formatDate(seller.date_joined, false)}</span>
                </div>
                {seller.profile.phone && !isOwner && (
                  <div className="seller-detail">
                    <i className="fas fa-phone"></i>
                    <span>{seller.profile.phone}</span>
                  </div>
                )}
              </div>
              
              {seller.profile.bio && (
                <div className="seller-bio">
                  <h3>О продавце</h3>
                  <p>{seller.profile.bio}</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Статистика продавца - компактные карточки */}
          <div className="seller-stats-compact">
            <div className="stat-card">
              <h3 className="stat-value">{sellerCars.length}</h3>
              <p className="stat-label">Активных<br/>аукционов</p>
            </div>
            <div className="stat-card">
              <h3 className="stat-value">{seller.profile.rating_count || 0}</h3>
              <p className="stat-label">Отзывов<br/>получено</p>
            </div>
            <div className="stat-card">
              <h3 className="stat-value">{parseFloat(seller.profile.rating || 0).toFixed(1)}</h3>
              <p className="stat-label">Рейтинг<br/>продавца</p>
            </div>
          </div>
        </div>
        
        {/* Секция лотов продавца */}
        <div className="seller-auction-section">
          <h2>Активные аукционы продавца</h2>
          {sellerCars.length > 0 ? (
            <div className="auction-grid">
              {sellerCars.map(car => (
                <div key={car.id} className="auction-card profile-auction-card">
                  <Link to={`/auction/${car.id}`} className="auction-card-link">
                    <div className="card-image">
                      {car.image_url || car.image ? (
                        <img 
                          src={processImageUrl(car.image_url || car.image)} 
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
                        <span className="current-price">{car.current_price ? `${car.current_price} ₽` : `${car.starting_price} ₽`}</span>
                        <span className="bid-count">
                          {car.bid_count || 0} ставк{car.bid_count === 1 ? 'а' : car.bid_count >= 2 && car.bid_count <= 4 ? 'и' : 'ок'}
                        </span>
                      </div>
                      
                      {car.status === 'active' && car.end_time && (
                        <div className="timer-container">
                          <Timer endTime={car.end_time} compact={true} />
                        </div>
                      )}
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-auctions">
              <h3>Нет активных аукционов</h3>
              <p>У продавца пока нет активных аукционов.</p>
            </div>
          )}
        </div>
        
        {/* Секция отзывов */}
        <div className="seller-auction-section">
          <h2>Отзывы о продавце</h2>
          
          {/* Форма отзыва */}
          {!isOwner && user && (
            <div id="review-form" className="seller-review-form">
              <h3>{editingReviewId ? 'Редактировать отзыв' : (userReview ? 'Вы уже оставили отзыв' : 'Оставить отзыв')}</h3>
              
              {!userReview || editingReviewId ? (
                <>
                  {successMessage && (
                    <div className="success-message">{successMessage}</div>
                  )}
                  
                  {reviewErrors.general && (
                    <div className="error-message">{reviewErrors.general}</div>
                  )}
                  
                  <form onSubmit={handleReviewSubmit} className="review-form">
                    <div className="review-form-grid">
                      <div className="review-rating-container">
                        <div className="form-group">
                          <label>Ваша оценка</label>
                          <div className="rating-input">
                            <StarRating 
                              value={reviewForm.rating} 
                              onChange={handleRatingChange}
                              readOnly={false}
                              size="large"
                            />
                          </div>
                          {reviewErrors.rating && (
                            <div className="error-message">{reviewErrors.rating}</div>
                          )}
                        </div>
                      </div>
                      
                      <div className="review-comment-container">
                        <div className="form-group">
                          <label htmlFor="comment">Ваш отзыв</label>
                          <textarea
                            id="comment"
                            name="comment"
                            value={reviewForm.comment}
                            onChange={handleReviewChange}
                            rows={5}
                            placeholder="Расскажите о вашем опыте работы с этим продавцом..."
                          />
                          {reviewErrors.comment && (
                            <div className="error-message">{reviewErrors.comment}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="form-actions">
                      <button 
                        type="submit" 
                        className="btn btn-primary"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Отправка...' : (editingReviewId ? 'Обновить отзыв' : 'Отправить отзыв')}
                      </button>
                      
                      {editingReviewId && (
                        <button 
                          type="button" 
                          className="btn btn-secondary ml-2"
                          onClick={handleCancelEdit}
                        >
                          Отменить
                        </button>
                      )}
                    </div>
                  </form>
                </>
              ) : (
                <div className="user-review-actions">
                  {/* Кнопки управления отзывами перенесены под каждый отзыв */}
                </div>
              )}
            </div>
          )}
          
          {/* Список отзывов */}
          {seller.reviews.length > 0 ? (
            <div className="seller-reviews-list">
              {seller.reviews.map(review => (
                <div key={review.id} className="review-item">
                  <div className="review-header">
                    <div className="reviewer-info">
                      <span className="reviewer-name">{review.reviewer_username}</span>
                      <span className="review-date">{formatDate(review.created_at, false)}</span>
                    </div>
                    <div className="review-rating">
                      <StarRating 
                        value={review.rating} 
                        readOnly={true}
                      />
                      <span className="rating-value">{review.rating}</span>
                    </div>
                  </div>
                  <div className="review-content">
                    <p>{review.comment}</p>
                  </div>
                  
                  {/* Кнопки редактирования/удаления для отзыва текущего пользователя */}
                  {user && review.reviewer_id === user.id && !editingReviewId && (
                    <div className="review-actions">
                      <button 
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => handleEditReview(review)}
                      >
                        <i className="fas fa-edit"></i> Редактировать
                      </button>
                      <button 
                        className="btn btn-sm btn-outline-danger ml-2"
                        onClick={() => handleDeleteReview(review.id)}
                      >
                        <i className="fas fa-trash"></i> Удалить
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="seller-reviews-empty">
              <p className="text-center">У этого продавца пока нет отзывов.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SellerProfilePage;