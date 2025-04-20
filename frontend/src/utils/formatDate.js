/**
 * Format a date string or timestamp to a human-readable date format
 * @param {string|number} dateString - The date to format
 * @param {boolean} includeTime - Whether to include the time
 * @returns {string} Formatted date string
 */
// Функция для конвертации даты в часовой пояс Новосибирска (GMT+7)
const convertToNovosibirskTime = (date) => {
  // Сначала получаем UTC время
  const utcDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
  // Затем добавляем 7 часов для Новосибирска (GMT+7)
  return new Date(utcDate.getTime() + 7 * 60 * 60000);
};

export const formatDate = (dateString, includeTime = true) => {
  if (!dateString) return 'N/A';
  
  try {
    let date;
    
    // Проверка, если дата в формате DD.MM.YYYY
    if (typeof dateString === 'string' && dateString.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
      const [day, month, year] = dateString.split('.');
      date = new Date(`${year}-${month}-${day}`);
    } else {
      date = new Date(dateString);
    }
    
    if (isNaN(date)) {
      return 'Дата не указана';
    }
    
    // Конвертируем в часовой пояс Новосибирска
    const novosibirskDate = convertToNovosibirskTime(date);
    
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };
    
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    
    return novosibirskDate.toLocaleDateString('ru-RU', options);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Ошибка форматирования даты';
  }
};

/**
 * Format a currency amount
 * @param {number|string} amount - The amount to format
 * @param {string} currency - The currency code
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = 'RUB') => {
  if (amount === undefined || amount === null) return 'N/A';
  
  try {
    // Parse the amount to a number if it's a string
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(numericAmount)) {
      return 'Invalid amount';
    }
    
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numericAmount);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return 'Error';
  }
};

/**
 * Format seconds to days, hours, minutes, and seconds
 * @param {number} seconds - The time in seconds
 * @returns {string} Formatted time string
 */
export const formatTimeRemaining = (seconds) => {
  if (seconds <= 0) {
    return 'Аукцион завершен';
  }
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  let result = '';
  
  if (days > 0) {
    result += `${days} ${getDaysWord(days)} `;
  }
  
  if (hours > 0 || days > 0) {
    result += `${hours} ${getHoursWord(hours)} `;
  }
  
  if (minutes > 0 || hours > 0 || days > 0) {
    result += `${minutes} ${getMinutesWord(minutes)} `;
  }
  
  result += `${remainingSeconds} сек.`;
  
  // Возвращаем строку в нормальном регистре, пишем с заглавной буквы первое слово
  return result.charAt(0).toUpperCase() + result.slice(1).toLowerCase();
};

/**
 * Функция для склонения минут
 * @param {number} minutes - количество минут
 * @returns {string} склоненное слово
 */
const getMinutesWord = (minutes) => {
  if (minutes >= 11 && minutes <= 19) {
    return 'минут';
  }
  
  const lastDigit = minutes % 10;
  
  if (lastDigit === 1) {
    return 'минуту';
  } else if (lastDigit >= 2 && lastDigit <= 4) {
    return 'минуты';
  } else {
    return 'минут';
  }
};

/**
 * Функция для склонения часов
 * @param {number} hours - количество часов
 * @returns {string} склоненное слово
 */
const getHoursWord = (hours) => {
  if (hours >= 11 && hours <= 19) {
    return 'часов';
  }
  
  const lastDigit = hours % 10;
  
  if (lastDigit === 1) {
    return 'час';
  } else if (lastDigit >= 2 && lastDigit <= 4) {
    return 'часа';
  } else {
    return 'часов';
  }
};

/**
 * Функция для склонения дней
 * @param {number} days - количество дней
 * @returns {string} склоненное слово
 */
const getDaysWord = (days) => {
  if (days >= 11 && days <= 19) {
    return 'дней';
  }
  
  const lastDigit = days % 10;
  
  if (lastDigit === 1) {
    return 'день';
  } else if (lastDigit >= 2 && lastDigit <= 4) {
    return 'дня';
  } else {
    return 'дней';
  }
};

/**
 * Get a relative time string (e.g., "2 hours ago", "just now")
 * @param {string|number} dateString - The date to format
 * @returns {string} Relative time string
 */
export const getRelativeTime = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    let date;
    
    // Проверка, если дата в формате DD.MM.YYYY
    if (typeof dateString === 'string' && dateString.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
      const [day, month, year] = dateString.split('.');
      date = new Date(`${year}-${month}-${day}`);
    } else {
      date = new Date(dateString);
    }
    
    if (isNaN(date)) {
      return 'Дата не указана';
    }
    
    // Конвертируем в часовой пояс Новосибирска
    const novosibirskDate = convertToNovosibirskTime(date);
    // Текущее время в Новосибирске
    const nowInNovosibirsk = convertToNovosibirskTime(new Date());
    
    const diffInSeconds = Math.floor((nowInNovosibirsk - novosibirskDate) / 1000);
    
    if (diffInSeconds < 60) {
      return 'только что';
    }
    
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} ${getMinutesWord(minutes)} назад`;
    }
    
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} ${getHoursWord(hours)} назад`;
    }
    
    if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} ${getDaysWord(days)} назад`;
    }
    
    return formatDate(dateString);
  } catch (error) {
    console.error('Error getting relative time:', error);
    return 'Ошибка форматирования даты';
  }
};
