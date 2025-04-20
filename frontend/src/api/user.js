import { API_URL } from './config';
import { getAuthHeader, refreshToken } from './auth';

// Get current user profile
export const getUserProfile = async () => {
  try {
    const response = await fetch(`${API_URL}/api/users/profile/`, {
      method: 'GET',
      headers: {
        ...getAuthHeader(),
      },
      credentials: 'include',
    });
    
    // If token expired, try to refresh
    if (response.status === 401) {
      try {
        await refreshToken();
        // Retry with new token
        const retryResponse = await fetch(`${API_URL}/api/users/profile/`, {
          method: 'GET',
          headers: {
            ...getAuthHeader(),
          },
          credentials: 'include',
        });
        
        if (!retryResponse.ok) {
          const data = await retryResponse.json();
          throw new Error(data.detail || 'Failed to fetch user profile');
        }
        
        return await retryResponse.json();
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        throw new Error('Session expired. Please log in again.');
      }
    }
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.detail || 'Failed to fetch user profile');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

// Update user profile
export const updateUserProfile = async (profileData) => {
  try {
    const response = await fetch(`${API_URL}/api/users/profile/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(profileData),
      credentials: 'include',
    });
    
    if (response.status === 401) {
      try {
        await refreshToken();
        // Retry with new token
        const retryResponse = await fetch(`${API_URL}/api/users/profile/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(),
          },
          body: JSON.stringify(profileData),
          credentials: 'include',
        });
        
        if (!retryResponse.ok) {
          const data = await retryResponse.json();
          throw new Error(data.detail || 'Failed to update user profile');
        }
        
        return await retryResponse.json();
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        throw new Error('Session expired. Please log in again.');
      }
    }
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.detail || 'Failed to update user profile');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

// Get user's auction history (cars they've bid on or sold)
export const getUserAuctionHistory = async () => {
  try {
    const response = await fetch(`${API_URL}/api/auction/history/`, {
      method: 'GET',
      headers: {
        ...getAuthHeader(),
      },
    });
    
    if (response.status === 401) {
      try {
        await refreshToken();
        // Retry with new token
        const retryResponse = await fetch(`${API_URL}/api/auction/history/`, {
          method: 'GET',
          headers: {
            ...getAuthHeader(),
          },
        });
        
        if (!retryResponse.ok) {
          const data = await retryResponse.json();
          throw new Error(data.detail || 'Failed to fetch auction history');
        }
        
        return await retryResponse.json();
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        throw new Error('Session expired. Please log in again.');
      }
    }
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.detail || 'Failed to fetch auction history');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching user auction history:', error);
    throw error;
  }
};

// Получить профиль продавца по ID
export const getSellerProfile = async (sellerId) => {
  try {
    const response = await fetch(`${API_URL}/api/users/sellers/${sellerId}/`, {
      method: 'GET',
      headers: {
        ...getAuthHeader(),
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail || 'Не удалось загрузить профиль продавца');
    }
    
    return data;
  } catch (error) {
    console.error(`Ошибка при загрузке профиля продавца с ID ${sellerId}:`, error);
    throw error;
  }
};

// Получить отзывы продавца по ID
export const getSellerReviews = async (sellerId) => {
  try {
    const response = await fetch(`${API_URL}/api/users/sellers/${sellerId}/reviews/`, {
      method: 'GET',
      headers: {
        ...getAuthHeader(),
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail || 'Не удалось загрузить отзывы продавца');
    }
    
    return data;
  } catch (error) {
    console.error(`Ошибка при загрузке отзывов продавца с ID ${sellerId}:`, error);
    throw error;
  }
};

// Оставить отзыв продавцу
export const submitSellerReview = async (sellerId, reviewData) => {
  try {
    const response = await fetch(`${API_URL}/api/users/sellers/${sellerId}/reviews/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(reviewData),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail || 'Не удалось отправить отзыв');
    }
    
    return data;
  } catch (error) {
    console.error('Ошибка при отправке отзыва:', error);
    throw error;
  }
};

// Обновить отзыв продавцу
export const updateSellerReview = async (sellerId, reviewId, reviewData) => {
  try {
    const response = await fetch(`${API_URL}/api/users/sellers/${sellerId}/reviews/${reviewId}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(reviewData),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail || 'Не удалось обновить отзыв');
    }
    
    return data;
  } catch (error) {
    console.error('Ошибка при обновлении отзыва:', error);
    throw error;
  }
};

// Удалить отзыв продавцу
export const deleteSellerReview = async (sellerId, reviewId) => {
  try {
    const response = await fetch(`${API_URL}/api/users/sellers/${sellerId}/reviews/${reviewId}/`, {
      method: 'DELETE',
      headers: {
        ...getAuthHeader(),
      },
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.detail || 'Не удалось удалить отзыв');
    }
    
    return true;
  } catch (error) {
    console.error('Ошибка при удалении отзыва:', error);
    throw error;
  }
};
