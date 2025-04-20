/**
 * Форматирует дату и время для отображения
 * @param {string} dateString - Строка даты в формате ISO
 * @returns {string} Форматированная дата и время
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  
  // Проверка на валидность даты
  if (isNaN(date.getTime())) return '';
  
  const options = { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric',
    hour: '2-digit', 
    minute: '2-digit'
  };
  
  return date.toLocaleString('ru-RU', options);
};

/**
 * Форматирует оставшееся время в человекопонятном формате
 * @param {number} seconds - Оставшиеся секунды
 * @returns {string} Отформатированная строка времени
 */
export const formatTimeRemaining = (seconds) => {
  if (seconds <= 0) return 'Завершен';
  
  const days = Math.floor(seconds / (60 * 60 * 24));
  const hours = Math.floor((seconds % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  
  let result = '';
  
  if (days > 0) {
    result += `${days} д. `;
  }
  
  if (hours > 0 || days > 0) {
    result += `${hours} ч. `;
  }
  
  result += `${minutes} мин.`;
  
  return result;
};