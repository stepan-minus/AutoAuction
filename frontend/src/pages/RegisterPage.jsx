import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import VerificationAfterRegistration from '../components/auth/VerificationAfterRegistration';

const RegisterPage = () => {
  const [userData, setUserData] = useState({
    username: '',
    email: '',
    password: '',
    password2: '',
    first_name: '',
    last_name: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!userData.username) {
      newErrors.username = 'Необходимо указать имя пользователя';
    } else if (userData.username.length < 3) {
      newErrors.username = 'Имя пользователя должно содержать минимум 3 символа';
    }
    
    if (!userData.email) {
      newErrors.email = 'Необходимо указать email';
    } else if (!/\S+@\S+\.\S+/.test(userData.email)) {
      newErrors.email = 'Неверный формат email';
    }
    
    if (!userData.password) {
      newErrors.password = 'Необходимо указать пароль';
    } else if (userData.password.length < 8) {
      newErrors.password = 'Пароль должен содержать минимум 8 символов';
    }
    
    if (!userData.password2) {
      newErrors.password2 = 'Пожалуйста, подтвердите пароль';
    } else if (userData.password !== userData.password2) {
      newErrors.password2 = 'Пароли не совпадают';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const [registrationComplete, setRegistrationComplete] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await register(userData);
      
      // Если регистрация прошла успешно, показываем форму подтверждения email
      if (result?.email_verification_sent) {
        setRegistrationComplete(true);
      } else {
        // В случае, если флаг не был установлен, все равно переходим на главную
        navigate('/');
      }
    } catch (err) {
      // Handle API error responses
      if (err.response && err.response.data) {
        setErrors(prev => ({
          ...prev,
          ...err.response.data
        }));
      } else {
        setErrors({
          general: err.message || 'Ошибка регистрации. Пожалуйста, попробуйте еще раз.'
        });
      }
    } finally {
      setLoading(false);
    }
  };
  
  if (registrationComplete) {
    // Новый подход - сразу показываем форму верификации пользователю
    return (
      <div className="auth-page register-page">
        <div className="auth-container">
          <VerificationAfterRegistration email={userData.email} />
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page register-page">
      <div className="auth-container">
        <h1>Создание аккаунта</h1>
        
        <form onSubmit={handleSubmit} className="auth-form">
          {errors.general && (
            <div className="error-message general-error">
              {errors.general}
            </div>
          )}
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="first_name">Имя</label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                value={userData.first_name}
                onChange={handleChange}
                placeholder="Иван"
                style={{ backgroundColor: '#d2d0cb' }}
              />
              {errors.first_name && <div className="error-message">{errors.first_name}</div>}
            </div>
            
            <div className="form-group">
              <label htmlFor="last_name">Фамилия</label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                value={userData.last_name}
                onChange={handleChange}
                placeholder="Иванов"
                style={{ backgroundColor: '#d2d0cb' }}
              />
              {errors.last_name && <div className="error-message">{errors.last_name}</div>}
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="username">Имя пользователя*</label>
            <input
              type="text"
              id="username"
              name="username"
              value={userData.username}
              onChange={handleChange}
              placeholder="Выберите имя пользователя"
              required
              style={{ backgroundColor: '#d2d0cb' }}
            />
            {errors.username && <div className="error-message">{errors.username}</div>}
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email*</label>
            <input
              type="email"
              id="email"
              name="email"
              value={userData.email}
              onChange={handleChange}
              placeholder="ваш_email@example.com"
              required
              style={{ backgroundColor: '#d2d0cb' }}
            />
            {errors.email && <div className="error-message">{errors.email}</div>}
            <small className="form-text">
              После регистрации потребуется подтверждение email
            </small>
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Пароль*</label>
            <input
              type="password"
              id="password"
              name="password"
              value={userData.password}
              onChange={handleChange}
              placeholder="Создайте пароль"
              required
              style={{ backgroundColor: '#d2d0cb' }}
            />
            {errors.password && <div className="error-message">{errors.password}</div>}
            <small className="form-text">
              Пароль должен содержать минимум 8 символов
            </small>
          </div>
          
          <div className="form-group">
            <label htmlFor="password2">Подтверждение пароля*</label>
            <input
              type="password"
              id="password2"
              name="password2"
              value={userData.password2}
              onChange={handleChange}
              placeholder="Подтвердите пароль"
              required
              style={{ backgroundColor: '#d2d0cb' }}
            />
            {errors.password2 && <div className="error-message">{errors.password2}</div>}
          </div>
          
          <button 
            type="submit" 
            className="nfs-button nfs-button-primary nfs-button-flicker"
            disabled={loading}
          >
            <span>{loading ? 'Создание аккаунта...' : 'Зарегистрироваться'}</span>
          </button>
          
          <p className="auth-redirect">
            Уже есть аккаунт? <Link to="/login">Войти</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
