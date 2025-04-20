import { API_URL } from './config';
import { getAuthHeader, getCSRFToken } from './auth';
import { api } from './api';

// Get all cars (paginated)
export const getCars = async (page = 1, pageSize = 10) => {
  try {
    const response = await fetch(`${API_URL}/api/auction/cars/?page=${page}&page_size=${pageSize}`, {
      method: 'GET',
      headers: {
        ...getAuthHeader(),
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail || 'Failed to fetch cars');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching cars:', error);
    throw error;
  }
};

// Get filtered cars
export const getFilteredCars = async (filters, page = 1, pageSize = 10) => {
  try {
    // Build query string from filters
    const queryParams = new URLSearchParams({
      page: page,
      page_size: pageSize,
      ...filters
    });
    
    const response = await fetch(`${API_URL}/api/auction/cars/filter/?${queryParams}`, {
      method: 'GET',
      headers: {
        ...getAuthHeader(),
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail || 'Failed to fetch filtered cars');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching filtered cars:', error);
    throw error;
  }
};

// Get single car details
export const getCarDetails = async (carId) => {
  try {
    const response = await fetch(`${API_URL}/api/auction/cars/${carId}/`, {
      method: 'GET',
      headers: {
        ...getAuthHeader(),
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail || 'Failed to fetch car details');
    }
    
    return data;
  } catch (error) {
    console.error(`Error fetching car with ID ${carId}:`, error);
    throw error;
  }
};

// Create new car auction
export const createCarAuction = async (carData) => {
  try {
    // If file upload is included, use FormData
    let requestBody;
    let headers = {
      ...getAuthHeader(),
    };
    
    // Всегда используем FormData для поддержки множественных изображений
    requestBody = new FormData();
    
    // Add all other car data
    Object.keys(carData).forEach(key => {
      if (key === 'image' && carData.image instanceof File) {
        // Обратная совместимость с одиночным изображением
        requestBody.append('image', carData.image);
      } else if (key === 'images' && Array.isArray(carData.images)) {
        // Добавляем множественные изображения
        carData.images.forEach(image => {
          if (image instanceof File) {
            requestBody.append('images', image);
          }
        });
      } else if (key === 'tags' || key === 'payment_methods') {
        // For arrays, append each item separately with the same key
        if (Array.isArray(carData[key])) {
          carData[key].forEach(item => {
            requestBody.append(`${key}_ids`, item);
          });
        }
      } else {
        requestBody.append(key, carData[key]);
      }
    });
    
    // Для FormData не нужно устанавливать Content-Type, браузер сделает это автоматически
    delete headers['Content-Type'];
    
    const response = await fetch(`${API_URL}/api/auction/cars/`, {
      method: 'POST',
      headers: headers,
      body: requestBody,
      credentials: 'include',
    });

    const data = await response.json();
    
    if (!response.ok) {
      // Обработка различных типов ошибок от сервера
      let errorMessage = 'Failed to create car auction';
      
      if (data.detail) {
        errorMessage = data.detail;
      } else if (data.error) {
        errorMessage = data.error;
      } else if (typeof data === 'object' && Object.keys(data).length > 0) {
        // Обработка ошибок валидации полей
        const fieldErrors = Object.entries(data)
          .map(([field, errors]) => {
            if (Array.isArray(errors)) {
              return `${field}: ${errors.join(', ')}`;
            }
            return `${field}: ${errors}`;
          })
          .join('; ');
        errorMessage = fieldErrors;
      }
      
      throw new Error(errorMessage);
    }
    
    return data;
  } catch (error) {
    console.error('Error creating car auction:', error);
    throw error;
  }
};

// Update car auction
export const updateCarAuction = async (carId, carData) => {
  try {
    // Similar to create, handle FormData if needed
    let requestBody;
    let headers = {
      ...getAuthHeader(),
    };
    
    // Всегда используем FormData для поддержки множественных изображений
    requestBody = new FormData();
    
    // Add all car data
    Object.keys(carData).forEach(key => {
      if (key === 'image' && carData.image instanceof File) {
        // Обратная совместимость с одиночным изображением
        requestBody.append('image', carData.image);
      } else if (key === 'images' && Array.isArray(carData.images)) {
        // Добавляем множественные изображения
        carData.images.forEach(image => {
          if (image instanceof File) {
            requestBody.append('images', image);
          }
        });
      } else if (key === 'tags' || key === 'payment_methods') {
        // For arrays, append each item separately with the same key
        if (Array.isArray(carData[key])) {
          carData[key].forEach(item => {
            requestBody.append(`${key}_ids`, item);
          });
        }
      } else {
        requestBody.append(key, carData[key]);
      }
    });
    
    // Для FormData не нужно устанавливать Content-Type, браузер сделает это автоматически
    delete headers['Content-Type'];
    
    const response = await fetch(`${API_URL}/api/auction/cars/${carId}/`, {
      method: 'PATCH',
      headers: headers,
      body: requestBody,
      credentials: 'include',
    });

    const data = await response.json();
    
    if (!response.ok) {
      // Обработка различных типов ошибок от сервера
      let errorMessage = 'Failed to update car auction';
      
      if (data.detail) {
        errorMessage = data.detail;
      } else if (data.error) {
        errorMessage = data.error;
      } else if (typeof data === 'object' && Object.keys(data).length > 0) {
        // Обработка ошибок валидации полей
        const fieldErrors = Object.entries(data)
          .map(([field, errors]) => {
            if (Array.isArray(errors)) {
              return `${field}: ${errors.join(', ')}`;
            }
            return `${field}: ${errors}`;
          })
          .join('; ');
        errorMessage = fieldErrors;
      }
      
      throw new Error(errorMessage);
    }
    
    return data;
  } catch (error) {
    console.error(`Error updating car with ID ${carId}:`, error);
    throw error;
  }
};

// Delete car auction
export const deleteCarAuction = async (carId) => {
  try {
    const response = await fetch(`${API_URL}/api/auction/cars/${carId}/`, {
      method: 'DELETE',
      headers: {
        ...getAuthHeader(),
      },
      credentials: 'include',
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.detail || 'Failed to delete car auction');
    }
    
    // If successful, the response might be 204 No Content
    return true;
  } catch (error) {
    console.error(`Error deleting car with ID ${carId}:`, error);
    throw error;
  }
};

// Get bids for a car
export const getCarBids = async (carId) => {
  try {
    console.log(`API: Fetching bids for car ID ${carId}`);
    
    // Добавляем уникальный timestamp чтобы всегда получать свежие данные
    const timestamp = new Date().getTime();
    const response = await fetch(`${API_URL}/api/auction/cars/${carId}/bids/?_=${timestamp}`, {
      method: 'GET',
      headers: {
        ...getAuthHeader(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      cache: 'no-cache',
      credentials: 'include'
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail || 'Failed to fetch bids');
    }
    
    console.log(`API: Successfully fetched ${data.length} bids for car ID ${carId}`);
    
    // Преобразуем структуру ставок для согласованности
    const formattedBids = data.map(bid => {
      // Проверяем наличие правильной структуры bidder
      if (!bid.bidder || !bid.bidder.username) {
        // Если структура bidder неполная, создаем полную
        return {
          ...bid,
          bidder: {
            id: bid.bidder?.id || 0,
            username: bid.bidder_name || 'Неизвестный'
          }
        };
      }
      return bid;
    });
    
    // Сортируем ставки по сумме и времени
    const sortedBids = formattedBids.sort((a, b) => {
      // По сумме (убывание)
      if (parseFloat(a.amount) !== parseFloat(b.amount)) {
        return parseFloat(b.amount) - parseFloat(a.amount);
      }
      // По времени (сначала новые)
      return new Date(b.created_at) - new Date(a.created_at);
    });
    
    return sortedBids;
  } catch (error) {
    console.error(`API: Error fetching bids for car ID ${carId}:`, error);
    throw error;
  }
};

// Получение актуальной цены аукциона
export const getCurrentPrice = async (carId) => {
  try {
    console.log(`API: Fetching current price for car ID ${carId}`);
    
    // Добавляем timestamp для предотвращения кэширования
    const timestamp = new Date().getTime();
    const response = await fetch(`${API_URL}/api/auction/cars/${carId}/?_=${timestamp}`, {
      method: 'GET',
      headers: {
        ...getAuthHeader(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      cache: 'no-cache',
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to fetch current price');
    }
    
    const carDetails = await response.json();
    console.log(`API: Current price for car ID ${carId} is ${carDetails.current_price}`);
    
    return carDetails.current_price;
  } catch (error) {
    console.error(`API: Error fetching current price for car ID ${carId}:`, error);
    throw error;
  }
};

// Функцию getCSRFToken импортировали выше

// Place a bid
export const placeBid = async (carId, amount) => {
  try {
    console.log(`API: Attempting to place bid on car ID ${carId} with amount ${amount}`);
    
    // Get the authentication token
    const authHeaders = getAuthHeader();
    console.log('API: Auth headers present:', Object.keys(authHeaders).length > 0);
    
    // Get CSRF token
    const csrfToken = getCSRFToken();
    console.log('API: CSRF token present:', !!csrfToken);
    
    // Добавляем timestamp для обхода кэширования
    const timestamp = new Date().getTime();
    // Исправляем URL, добавляя /api/ в начале пути
    const url = `${API_URL}/api/auction/bids/create/?_=${timestamp}`;
    
    // Make the API request
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-CSRFToken': csrfToken || '',
        ...authHeaders,
      },
      body: JSON.stringify({
        car: carId,
        amount: amount,
      }),
      credentials: 'include',
      cache: 'no-cache',
    });

    console.log(`API: Bid response status: ${response.status} ${response.statusText}`);
    
    // Parse response data
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
      console.log('API: Bid response data:', data);
    } else {
      console.log('API: Bid response is not JSON');
      data = { detail: `Unexpected server response: ${response.statusText}` };
    }
    
    if (!response.ok) {
      // Улучшенная обработка ошибок размещения ставок
      let errorMessage = 'Failed to place bid';
      let errorType = null;
      
      // Определяем специальные типы ошибок для удобства обработки на клиенте
      
      // Проверяем структуру ошибки с полем "error" (новый формат)
      if (data.error) {
        errorMessage = data.error;
        
        // Определяем типы ошибок по ключевым словам
        if (errorMessage.toLowerCase().includes('собственную ставку') || 
            errorMessage.toLowerCase().includes('own bid') ||
            errorMessage.toLowerCase().includes('перебить свою')) {
          errorType = 'OWN_BID';
        } else if (errorMessage.toLowerCase().includes('собственный аукцион') || 
                   errorMessage.toLowerCase().includes('own auction') ||
                   errorMessage.toLowerCase().includes('свой собственный')) {
          errorType = 'OWN_AUCTION';
        }
      } 
      // Обрабатываем стандартные типы ответов с ошибками
      else if (data.detail) {
        errorMessage = data.detail;
      } 
      // Обрабатываем объекты с ошибками валидации
      else if (typeof data === 'object' && Object.keys(data).length > 0) {
        // Обработка ошибок валидации полей
        const fieldErrors = Object.entries(data)
          .map(([field, errors]) => {
            if (Array.isArray(errors)) {
              return `${field}: ${errors.join(', ')}`;
            }
            return `${field}: ${errors}`;
          })
          .join('; ');
        errorMessage = fieldErrors;
      }
      
      console.error(`API: Bid error message: ${errorMessage}`, errorType ? `(Type: ${errorType})` : '');
      
      // Создаем расширенный объект ошибки с типом для облегчения обработки
      const error = new Error(errorMessage);
      if (errorType) {
        error.errorType = errorType;
      }
      
      throw error;
    }
    
    console.log(`API: Bid placed successfully on car ID ${carId}`);
    
    // Сразу после успешной ставки обновляем текущую цену и список ставок
    try {
      console.log("API: Triggering immediate data refresh after successful bid");
      
      // Получаем актуальную цену
      const newPrice = await getCurrentPrice(carId);
      console.log(`API: Updated price after bid: ${newPrice}`);
      
      // Получаем новый список ставок
      const updatedBids = await getCarBids(carId);
      console.log(`API: Updated bids after successful bid: ${updatedBids.length} bids`);
      
      // Добавляем информацию о цене и обновленных ставках в возвращаемые данные
      return {
        ...data,
        current_price: newPrice,
        updated_bids: updatedBids
      };
    } catch (refreshError) {
      console.error("API: Failed to refresh data after bid", refreshError);
      // Возвращаем оригинальный ответ в случае ошибки обновления
      return data;
    }
  } catch (error) {
    console.error(`API: Error placing bid on car ID ${carId}:`, error);
    throw error;
  }
};

// Get auction history
export const getAuctionHistory = async (carId = null) => {
  try {
    const url = carId 
      ? `${API_URL}/api/auction/history/${carId}/` 
      : `${API_URL}/api/auction/history/`;
      
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...getAuthHeader(),
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail || 'Failed to fetch auction history');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching auction history:', error);
    throw error;
  }
};

// Get all available tags
export const getTags = async () => {
  try {
    const response = await fetch(`${API_URL}/api/auction/tags/`, {
      method: 'GET',
      headers: {
        ...getAuthHeader(),
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail || 'Failed to fetch tags');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching tags:', error);
    throw error;
  }
};

// Get all available payment methods
export const getPaymentMethods = async () => {
  try {
    const response = await fetch(`${API_URL}/api/auction/payment-methods/`, {
      method: 'GET',
      headers: {
        ...getAuthHeader(),
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail || 'Failed to fetch payment methods');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    throw error;
  }
};

export const createAuction = async (auctionData) => {
  try {
    const formData = new FormData();
    formData.append('title', auctionData.title);
    formData.append('description', auctionData.description);
    formData.append('start_price', parseFloat(auctionData.startPrice));
    formData.append('end_time', new Date(auctionData.endDate).toISOString());
    formData.append('status', 'active');
    
    if (auctionData.image instanceof File) {
      formData.append('image', auctionData.image);
    }

    formData.append('brand', auctionData.brand);
    formData.append('model', auctionData.model);
    formData.append('year', parseInt(auctionData.year, 10));
    formData.append('description', auctionData.description);
    formData.append('starting_price', Math.min(parseFloat(auctionData.startPrice), 9999999999));
    formData.append('current_price', Math.min(parseFloat(auctionData.startPrice), 9999999999));
    formData.append('min_bid_increment', parseFloat(auctionData.min_bid_increment || 100));
    formData.append('mileage', parseInt(auctionData.mileage || 0, 10));
    formData.append('end_time', new Date(auctionData.endDate).toISOString());
    formData.append('status', 'active');
    
    // Получаем заголовки аутентификации
    const authHeaders = getAuthHeader();
    
    // Для FormData не нужно устанавливать Content-Type, браузер сделает это автоматически
    const response = await fetch(`${API_URL}/api/auction/cars/`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers: authHeaders
    });

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
      const data = await response.json();
      
      if (!response.ok) {
        const errorMessage = typeof data === 'object' ? 
          Object.entries(data).map(([key, value]) => `${key}: ${value}`).join(', ') :
          data.detail || 'Failed to create auction';
        throw new Error(errorMessage);
      }
      
      return data;
    } else {
      throw new Error('Server error occurred. Please try again.');
    }
  } catch (error) {
    console.error('Error creating auction:', error);
    throw error;
  }
};

export const getAuctionDetails = async (id) => {
  return api.get(`/auction/${id}/`);
};

// Добавить изображение к аукциону
export const addImageToAuction = async (carId, imageFile) => {
  try {
    const formData = new FormData();
    formData.append('car', carId);
    formData.append('image', imageFile);
    formData.append('is_primary', false); // По умолчанию не основное изображение
    
    const headers = getAuthHeader();
    delete headers['Content-Type']; // Браузер автоматически установит правильный Content-Type с boundary
    
    const response = await fetch(`${API_URL}/api/auction/car-images/`, {
      method: 'POST',
      headers: headers,
      body: formData,
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail || 'Failed to add image');
    }
    
    return data;
  } catch (error) {
    console.error('Error adding image:', error);
    throw error;
  }
};

// Установить изображение как основное
export const setImageAsPrimary = async (imageId) => {
  try {
    const response = await fetch(`${API_URL}/api/auction/car-images/${imageId}/set-primary/`, {
      method: 'POST',
      headers: {
        ...getAuthHeader()
      },
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail || 'Failed to set image as primary');
    }
    
    return data;
  } catch (error) {
    console.error('Error setting image as primary:', error);
    throw error;
  }
};

// Удалить изображение
export const deleteImage = async (imageId) => {
  try {
    const response = await fetch(`${API_URL}/api/auction/car-images/${imageId}/`, {
      method: 'DELETE',
      headers: {
        ...getAuthHeader()
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      if (response.status !== 204) { // 204 No Content - успешное удаление
        const data = await response.json();
        throw new Error(data.detail || 'Failed to delete image');
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};