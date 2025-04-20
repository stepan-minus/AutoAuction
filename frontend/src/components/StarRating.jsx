import React from 'react';

/**
 * Компонент для отображения и выбора рейтинга звездами
 * @param {Object} props - свойства компонента
 * @param {number} props.value - текущее значение рейтинга (от 0 до 5)
 * @param {function} props.onChange - функция, вызываемая при изменении рейтинга
 * @param {boolean} props.readOnly - только для чтения, без возможности изменения
 * @returns {JSX.Element} Компонент рейтинга звездами
 */
const StarRating = ({ value = 0, onChange, readOnly = true, isReadOnly }) => {
  // Используем предоставленный isReadOnly или readOnly для обратной совместимости
  const readonly = isReadOnly !== undefined ? isReadOnly : readOnly;
  // Округляем до ближайшей половины для отображения половинок звезд
  const roundedValue = Math.round(value * 2) / 2;
  
  // Генерируем массив из 5 звезд
  const stars = Array.from({ length: 5 }, (_, index) => {
    const starValue = index + 1;
    
    // Определяем класс для звезды (полная, половина, пустая)
    let starClass = 'star empty';
    
    if (roundedValue >= starValue) {
      starClass = 'star full';
    } else if (roundedValue + 0.5 === starValue) {
      starClass = 'star half';
    }
    
    return (
      <span 
        key={index}
        className={starClass}
        onClick={() => !readonly && onChange && onChange(starValue)}
        style={{ cursor: readonly ? 'default' : 'pointer' }}
      >
        {starClass.includes('half') ? (
          <span className="star-container">
            <i className="fas fa-star-half-alt"></i>
          </span>
        ) : starClass.includes('full') ? (
          <i className="fas fa-star"></i>
        ) : (
          <i className="far fa-star"></i>
        )}
      </span>
    );
  });
  
  return (
    <div className="star-rating">
      {stars}
    </div>
  );
};

export default StarRating;