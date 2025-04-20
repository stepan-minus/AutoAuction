import React, { useState } from 'react';
import { Image } from 'react-bootstrap';

const ImageGallery = ({ car }) => {
  // Находим основное изображение или берем первое
  const mainImage = car.images.find(img => img.is_primary) || car.images[0];
  
  // Определяем индекс текущего изображения
  const initialIndex = car.images.findIndex(img => img.image_url === mainImage.image_url);
  const [currentIndex, setCurrentIndex] = useState(initialIndex !== -1 ? initialIndex : 0);

  // Проверяем URL и при необходимости преобразуем его
  const formatImageUrl = (url) => {
    if (!url) return '';
    return url.includes('0.0.0.0') 
      ? `/media/${url.split('/media/')[1]}` 
      : url;
  };

  // Обработчики для перемещения между изображениями
  const goToPrevious = () => {
    const isFirstImage = currentIndex === 0;
    const newIndex = isFirstImage ? car.images.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
  };

  const goToNext = () => {
    const isLastImage = currentIndex === car.images.length - 1;
    const newIndex = isLastImage ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
  };

  // Обработчик для прямого выбора изображения по индексу
  const goToImage = (index) => {
    setCurrentIndex(index);
  };

  return (
    <div className="slider-gallery-container">
      <div className="slider-main-image-container">
        {/* Основное изображение */}
        <img 
          src={formatImageUrl(car.images[currentIndex].image_url)} 
          alt={`${car.brand} ${car.model}`} 
          className="main-gallery-image"
        />
        
        {/* Кнопки навигации слева/справа */}
        {car.images.length > 1 && (
          <>
            <button 
              className="slider-nav-button prev-button" 
              onClick={goToPrevious}
              aria-label="Предыдущее изображение"
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            
            <button 
              className="slider-nav-button next-button" 
              onClick={goToNext}
              aria-label="Следующее изображение"
            >
              <i className="fas fa-chevron-right"></i>
            </button>
            
            {/* Индикатор текущего изображения */}
            <div className="slider-indicator">
              {currentIndex + 1} / {car.images.length}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ImageGallery;