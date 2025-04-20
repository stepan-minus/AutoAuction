import React, { createContext, useState, useContext, useEffect } from 'react';
import { getUserProfile } from '../api/user';
import { refreshToken, loginUser, logoutUser, isAuthenticated, registerUser } from '../api/auth';

// Create context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authTokens, setAuthTokens] = useState(() => {
    // Инициализация authTokens при запуске
    const access = localStorage.getItem('access_token');
    const refresh = localStorage.getItem('refresh_token');
    
    if (access) {
      return { access, refresh };
    }
    return null;
  });
  
  // Периодическое обновление токенов
  useEffect(() => {
    // Обновлять токен каждые 4 минуты
    const refreshIntervalId = setInterval(async () => {
      if (authTokens) {
        try {
          const refreshedTokenData = await refreshToken();
          setAuthTokens(prev => ({
            ...prev,
            access: refreshedTokenData.access
          }));
          console.log('Token refreshed automatically');
        } catch (error) {
          console.error('Failed to refresh token automatically:', error);
          // Clear token on refresh failure
          setAuthTokens(null);
          setUser(null);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      }
    }, 4 * 60 * 1000);  // 4 минуты
    
    return () => clearInterval(refreshIntervalId);
  }, [authTokens]);
  
  // Load user on first render if token exists
  useEffect(() => {
    const loadUser = async () => {
      if (isAuthenticated()) {
        try {
          const userData = await getUserProfile();
          
          // Проверяем, подтвержден ли email пользователя
          if (!userData.is_email_verified) {
            console.error('Email not verified, signing out');
            // Если email не подтвержден, выходим из системы
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            setAuthTokens(null);
            setError('Email не подтвержден. Пожалуйста, подтвердите ваш email для доступа к сайту.');
            setLoading(false);
            return;
          }
          
          setUser(userData);
          
          // Обновляем токены в состоянии компонента
          setAuthTokens({
            access: localStorage.getItem('access_token'),
            refresh: localStorage.getItem('refresh_token')
          });
          
        } catch (err) {
          console.error('Failed to load user:', err);
          
          // Try to refresh token if it failed
          try {
            const refreshData = await refreshToken();
            setAuthTokens({
              access: refreshData.access,
              refresh: localStorage.getItem('refresh_token')
            });
            
            const userData = await getUserProfile();
            
            // Проверяем, подтвержден ли email пользователя после обновления токена
            if (!userData.is_email_verified) {
              console.error('Email not verified after token refresh, signing out');
              // Если email не подтвержден, выходим из системы
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              setAuthTokens(null);
              setError('Email не подтвержден. Пожалуйста, подтвердите ваш email для доступа к сайту.');
              setLoading(false);
              return;
            }
            
            setUser(userData);
          } catch (refreshErr) {
            console.error('Token refresh failed:', refreshErr);
            // Clear localStorage on auth failure
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            setAuthTokens(null);
          }
        }
      }
      
      setLoading(false);
    };
    
    loadUser();
  }, []);
  
  // Register user
  const register = async (userData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await registerUser(userData);
      setUser(response.user);
      return response;
    } catch (err) {
      setError(err.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Login user
  const login = async (credentials) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await loginUser(credentials);
      
      // Проверяем, требуется ли верификация email
      if (response.email_verification_required) {
        const error = new Error('Email verification required');
        error.verificationRequired = true;
        throw error;
      }
      
      // Проверяем, подтвержден ли email пользователя
      if (!response.user.is_email_verified) {
        const error = new Error('Email не подтвержден. Пожалуйста, проверьте вашу почту и подтвердите email.');
        error.emailNotVerified = true;
        
        // Очищаем токены, так как пользователь не должен быть авторизован
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        
        throw error;
      }
      
      setUser(response.user);
      
      // Обновляем токены в состоянии
      setAuthTokens({
        access: localStorage.getItem('access_token'),
        refresh: localStorage.getItem('refresh_token')
      });
      
      return response;
    } catch (err) {
      // Если требуется верификация или email не подтвержден,
      // пробрасываем ошибку без установки ошибки в контексте
      if (err.verificationRequired || err.emailNotVerified) {
        throw err;
      }
      
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Logout user
  const logout = async () => {
    setLoading(true);
    
    try {
      await logoutUser();
      setUser(null);
      setAuthTokens(null); // Очищаем токены в состоянии
    } catch (err) {
      console.error('Logout error:', err);
      // Still remove user on error
      setUser(null);
      setAuthTokens(null); // Очищаем токены в состоянии даже при ошибке
    } finally {
      setLoading(false);
    }
  };
  
  // Update user info in context after profile update
  const updateUserInfo = (updatedUser) => {
    setUser(updatedUser);
  };
  
  // Context values
  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    error,
    register,
    login,
    logout,
    updateUserInfo,
    authTokens, // Use authTokens from state
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
