import { API_URL } from './config';

// Get CSRF token from cookie (This function is added)
export function getCSRFToken() {
  const name = 'csrftoken=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookieArray = decodedCookie.split(';');

  for (let cookie of cookieArray) {
    cookie = cookie.trim();
    if (cookie.indexOf(name) === 0) {
      return cookie.substring(name.length, cookie.length);
    }
  }
  return null;
}


// Register new user
export const registerUser = async (userData) => {
  try {
    const csrfToken = getCSRFToken();
    const response = await fetch(`${API_URL}/api/users/register/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken, // Added CSRF token header
      },
      body: JSON.stringify(userData),
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || data.error || Object.values(data)[0]?.[0] || 'Registration failed');
    }

    if (data.access && data.refresh) {
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
    }

    return data;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

// Login user
export const loginUser = async (credentials) => {
  try {
    const csrfToken = getCSRFToken();
    const response = await fetch(`${API_URL}/api/users/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken, // Added CSRF token header
      },
      body: JSON.stringify(credentials),
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Login failed');
    }

    // Store tokens in localStorage
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);

    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

// Logout user
export const logoutUser = async () => {
  try {
    const refreshToken = localStorage.getItem('refresh_token');

    if (!refreshToken) {
      throw new Error('No refresh token found');
    }

    const response = await fetch(`${API_URL}/api/users/logout/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'X-CSRFToken': getCSRFToken(), // Added CSRF token header
      },
      body: JSON.stringify({ refresh: refreshToken }),
      credentials: 'include',
    });

    // Clear tokens regardless of response
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');

    if (!response.ok) {
      const data = await response.json();
      console.warn('Logout had issues:', data);
    }

    return true;
  } catch (error) {
    console.error('Logout error:', error);
    // Still remove tokens on error
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    return false;
  }
};

// Refresh token
export const refreshToken = async () => {
  try {
    const refreshToken = localStorage.getItem('refresh_token');
    const csrfToken = getCSRFToken();

    if (!refreshToken) {
      throw new Error('No refresh token found');
    }

    const response = await fetch(`${API_URL}/api/users/token/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken, // Added CSRF token header
      },
      body: JSON.stringify({ refresh: refreshToken }),
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Token refresh failed');
    }

    localStorage.setItem('access_token', data.access);

    return data;
  } catch (error) {
    console.error('Token refresh error:', error);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    throw error;
  }
};

// Password reset request
export const requestPasswordReset = async (email) => {
  try {
    const csrfToken = getCSRFToken();
    const response = await fetch(`${API_URL}/api/users/password/reset/request/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken, // Added CSRF token header
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Password reset request failed');
    }

    return data;
  } catch (error) {
    console.error('Password reset request error:', error);
    throw error;
  }
};

// Confirm password reset
export const confirmPasswordReset = async (token, password) => {
  try {
    const csrfToken = getCSRFToken();
    const response = await fetch(`${API_URL}/api/users/password/reset/confirm/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken, // Added CSRF token header
      },
      body: JSON.stringify({ token, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Password reset failed');
    }

    return data;
  } catch (error) {
    console.error('Password reset error:', error);
    throw error;
  }
};

// Change password
export const changePassword = async (oldPassword, newPassword) => {
  try {
    const csrfToken = getCSRFToken();
    const response = await fetch(`${API_URL}/api/users/password/change/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'X-CSRFToken': csrfToken, // Added CSRF token header
      },
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Password change failed');
    }

    return data;
  } catch (error) {
    console.error('Password change error:', error);
    throw error;
  }
};

// Request email verification code
export const requestEmailVerification = async (email) => {
  try {
    if (!email) {
      throw new Error('Email is required');
    }
    
    console.log('Отправка запроса на подтверждение email:', email);
    
    const csrfToken = getCSRFToken();
    
    // Проверяем наличие JWT токена
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('Не авторизован. Пожалуйста, войдите в систему.');
    }
    
    const response = await fetch(`${API_URL}/api/users/email/verify/request/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-CSRFToken': csrfToken,
      },
      body: JSON.stringify({ email: email }), // Убедимся, что email передается корректно
      credentials: 'include',
    });

    let data;
    try {
      data = await response.json();
    } catch (e) {
      console.error('Ошибка при разборе JSON ответа:', e);
      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status} ${response.statusText}`);
      }
      return { detail: 'Код подтверждения отправлен' };
    }

    if (!response.ok) {
      console.error('Ошибка при запросе верификации:', data);
      throw new Error(data.detail || data.error || (data.email && data.email[0]) || 'Не удалось отправить код подтверждения');
    }

    return data;
  } catch (error) {
    console.error('Email verification request error:', error);
    throw error;
  }
};

// Confirm email verification with code for authorized users
export const confirmEmailVerification = async (code) => {
  try {
    const csrfToken = getCSRFToken();
    const response = await fetch(`${API_URL}/api/users/email/verify/confirm/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'X-CSRFToken': csrfToken,
      },
      body: JSON.stringify({ code }),
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || data.error || 'Failed to verify email');
    }

    return data;
  } catch (error) {
    console.error('Email verification confirmation error:', error);
    throw error;
  }
};

// Confirm email verification during login (without JWT token)
export const confirmLoginVerification = async (email, code) => {
  try {
    const csrfToken = getCSRFToken();
    const response = await fetch(`${API_URL}/api/users/login/verify/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
      },
      body: JSON.stringify({ email, code }),
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || data.error || 'Failed to verify email');
    }

    // Store tokens in localStorage
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);

    return data;
  } catch (error) {
    console.error('Login verification error:', error);
    throw error;
  }
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return !!localStorage.getItem('access_token');
};

// Get auth header
export const getAuthHeader = () => {
  const token = localStorage.getItem('access_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};