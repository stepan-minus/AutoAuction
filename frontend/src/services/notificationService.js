/**
 * Сервис для работы с уведомлениями
 */

/**
 * Добавить уведомление об успешной операции
 * @param {string} title - Заголовок уведомления
 * @param {string} message - Текст уведомления
 * @param {object} options - Дополнительные опции
 * @returns {number} id уведомления
 */
export const showSuccessNotification = (title, message, options = {}) => {
  if (!window.notificationManager) return null;
  
  return window.notificationManager.addNotification({
    title,
    message,
    type: 'success',
    ...options
  });
};

/**
 * Добавить предупреждающее уведомление
 * @param {string} title - Заголовок уведомления
 * @param {string} message - Текст уведомления
 * @param {object} options - Дополнительные опции
 * @returns {number} id уведомления
 */
export const showWarningNotification = (title, message, options = {}) => {
  if (!window.notificationManager) return null;
  
  return window.notificationManager.addNotification({
    title,
    message,
    type: 'warning',
    ...options
  });
};

/**
 * Добавить уведомление об ошибке
 * @param {string} title - Заголовок уведомления
 * @param {string} message - Текст уведомления
 * @param {object} options - Дополнительные опции
 * @returns {number} id уведомления
 */
export const showErrorNotification = (title, message, options = {}) => {
  if (!window.notificationManager) return null;
  
  return window.notificationManager.addNotification({
    title,
    message,
    type: 'danger',
    ...options
  });
};

/**
 * Добавить информационное уведомление
 * @param {string} title - Заголовок уведомления
 * @param {string} message - Текст уведомления
 * @param {object} options - Дополнительные опции
 * @returns {number} id уведомления
 */
export const showInfoNotification = (title, message, options = {}) => {
  if (!window.notificationManager) return null;
  
  return window.notificationManager.addNotification({
    title,
    message,
    type: 'info',
    ...options
  });
};

/**
 * Уведомление о перебитой ставке
 * @param {object} bidData - Данные о ставке
 */
export const showOutbidNotification = (bidData) => {
  const { 
    car, 
    amount, 
    car_id, 
    car_brand, 
    car_model, 
    previous_amount, 
    new_amount, 
    bidder_username 
  } = bidData;
  
  if (!window.notificationManager) return null;
  
  // Формируем полное имя автомобиля, убедившись, что оно определено
  let carName = 'автомобиль';
  if (car_brand && car_model) {
    carName = `${car_brand} ${car_model}`;
  } else if (car) {
    carName = car;
  }
  
  // Определяем сумму ставки из разных возможных источников данных
  const bidAmount = new_amount || amount || 0;
  const previousAmount = previous_amount || 0;
  const username = bidder_username || 'Другой участник';
  
  // Получаем существующие уведомления для этой ставки
  const existingNotifications = window.notificationManager.getNotifications()
    .filter(n => n.notificationType === 'outbid' && n.carId === car_id);
  
  // Если уже есть уведомление для этого автомобиля, удалим его перед добавлением нового
  existingNotifications.forEach(notification => {
    window.notificationManager.removeNotification(notification.id);
  });
  
  // Формируем сообщение с более детальной информацией
  let message = `${username} перебил вашу ставку на ${carName}`;
  if (previousAmount && bidAmount) {
    message += `. Ваша ставка: ${previousAmount} ₽, новая ставка: ${bidAmount} ₽`;
  } else {
    message += `. Новая цена: ${bidAmount} ₽`;
  }
  
  return window.notificationManager.addNotification({
    notificationType: 'outbid',
    type: 'outbid',
    title: 'Ваша ставка перебита!',
    message: message,
    carId: car_id,
    carBrand: car_brand || '',
    carModel: car_model || '',
    newBidAmount: bidAmount
  });
};

/**
 * Уведомление о выигрыше в аукционе
 * @param {object} auctionData - Данные об аукционе
 */
export const showAuctionWonNotification = (auctionData) => {
  const { car_id, car_brand, car_model, final_price, seller_id } = auctionData;
  
  if (!window.notificationManager) return null;
  
  // Формируем полное имя автомобиля, убедившись, что оно определено
  let carName = 'автомобиль';
  if (car_brand && car_model) {
    carName = `${car_brand} ${car_model}`;
  }
  
  // Получаем существующие уведомления для этого аукциона
  const existingNotifications = window.notificationManager.getNotifications()
    .filter(n => n.notificationType === 'auction_won' && n.carId === car_id);
  
  // Если уже есть уведомление для этого аукциона, удалим его перед добавлением нового
  existingNotifications.forEach(notification => {
    window.notificationManager.removeNotification(notification.id);
  });
  
  // Создаем кнопку для перехода в чат с продавцом
  const startChatAction = {
    text: 'Связаться с продавцом',
    callback: () => {
      // Перенаправляем пользователя на страницу чата с продавцом
      window.location.href = `/chat?sellerId=${seller_id}&carId=${car_id}`;
    }
  };
  
  return window.notificationManager.addNotification({
    notificationType: 'auction_won',
    type: 'auction_won',
    title: 'Поздравляем! Вы выиграли аукцион!',
    message: `Вы приобрели ${carName} за ${final_price} ₽`,
    carId: car_id,
    carBrand: car_brand || '',
    carModel: car_model || '',
    newBidAmount: final_price,
    seller_id: seller_id,
    duration: 0, // Уведомление будет показываться до тех пор, пока пользователь его не закроет
    dismissible: true,
    actions: [startChatAction]
  });
};

/**
 * Уведомление продавцу о завершении аукциона
 * @param {object} auctionData - Данные об аукционе
 */
export const showAuctionEndedNotification = (auctionData) => {
  const { car_id, car_brand, car_model, has_winner, winner_name, final_price, conversation_id } = auctionData;
  
  if (!window.notificationManager) return null;
  
  // Формируем полное имя автомобиля, убедившись, что оно определено
  let carName = 'автомобиль';
  if (car_brand && car_model) {
    carName = `${car_brand} ${car_model}`;
  }
  
  let message = has_winner 
    ? `Ваш аукцион ${carName} завершен. Победитель: ${winner_name}, финальная цена: ${final_price} ₽` 
    : `Ваш аукцион ${carName} завершен без ставок.`;
  
  // Получаем существующие уведомления для этого аукциона
  const existingNotifications = window.notificationManager.getNotifications()
    .filter(n => n.notificationType === 'auction_ended' && n.carId === car_id);
  
  // Если уже есть уведомление для этого аукциона, удалим его перед добавлением нового
  existingNotifications.forEach(notification => {
    window.notificationManager.removeNotification(notification.id);
  });
  
  return window.notificationManager.addNotification({
    notificationType: 'auction_ended',
    type: 'auction_ended',
    title: 'Аукцион завершен',
    message,
    carId: car_id,
    carBrand: car_brand || '',
    carModel: car_model || '',
    conversation_id: conversation_id
  });
};

/**
 * Удалить уведомление по id
 * @param {number} id - ID уведомления
 */
export const removeNotification = (id) => {
  if (!window.notificationManager) return;
  
  window.notificationManager.removeNotification(id);
};