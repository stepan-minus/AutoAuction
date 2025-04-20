import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { requestPasswordReset } from '../api/auth';
import LoginVerificationForm from '../components/auth/LoginVerificationForm';

const LoginPage = () => {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get redirect path from location state or default to home
  const from = location.state?.from?.pathname || '/';
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!credentials.email) {
      newErrors.email = 'Необходимо указать email';
    } else if (!/\S+@\S+\.\S+/.test(credentials.email)) {
      newErrors.email = 'Неверный формат email';
    }
    
    if (!credentials.password) {
      newErrors.password = 'Необходимо указать пароль';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      await login(credentials);
      navigate(from, { replace: true });
    } catch (err) {
      if (err.verificationRequired) {
        // Email требует верификации - показываем форму верификации
        setVerificationEmail(credentials.email);
        setShowVerification(true);
      } else if (err.emailNotVerified) {
        // Email не подтвержден - показываем соответствующую ошибку
        setErrors({
          general: err.message || 'Email не подтвержден. Пожалуйста, проверьте вашу почту и подтвердите email.'
        });
      } else {
        setErrors({
          general: err.message || 'Не удалось войти. Проверьте правильность email и пароля.'
        });
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleVerificationComplete = (user) => {
    // После успешной верификации переходим на главную страницу или
    // на страницу, с которой пользователь был перенаправлен на логин
    navigate(from, { replace: true });
  };
  
  const handleVerificationCancel = () => {
    // Возвращаемся к форме логина
    setShowVerification(false);
  };
  
  const handleResetEmailChange = (e) => {
    setResetEmail(e.target.value);
    setResetError('');
  };
  
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    
    if (!resetEmail) {
      setResetError('Пожалуйста, введите ваш email');
      return;
    }
    
    if (!/\S+@\S+\.\S+/.test(resetEmail)) {
      setResetError('Пожалуйста, введите корректный email');
      return;
    }
    
    setLoading(true);
    
    try {
      await requestPasswordReset(resetEmail);
      setResetSent(true);
      setResetError('');
    } catch (err) {
      setResetError(err.message || 'Не удалось отправить запрос на сброс пароля');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="auth-page login-page">
      <div className="auth-container">
        <h1>ВХОД</h1>
        
        {showVerification ? (
          // Email Verification Form
          <LoginVerificationForm 
            email={verificationEmail}
            onVerificationComplete={handleVerificationComplete}
            onCancel={handleVerificationCancel}
          />
        ) : !showResetForm ? (
          // Login Form
          <form onSubmit={handleSubmit} className="auth-form">
            {errors.general && (
              <div className="error-message general-error">
                {errors.general}
              </div>
            )}
            
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={credentials.email}
                onChange={handleChange}
                placeholder="Введите ваш email"
                required
                style={{ backgroundColor: '#d2d0cb' }}
              />
              {errors.email && <div className="error-message">{errors.email}</div>}
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Пароль</label>
              <input
                type="password"
                id="password"
                name="password"
                value={credentials.password}
                onChange={handleChange}
                placeholder="Введите ваш пароль"
                required
                style={{ backgroundColor: '#d2d0cb' }}
              />
              {errors.password && <div className="error-message">{errors.password}</div>}
            </div>
            
            <button 
              type="submit" 
              className="nfs-button nfs-button-primary nfs-button-flicker"
              disabled={loading}
            >
              <span>{loading ? 'Вход...' : 'Войти'}</span>
            </button>
            
            <div className="auth-links">
              <p>
                Забыли пароль? <a 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    setShowResetForm(true);
                  }}
                  style={{ textDecoration: 'none' }}
                >
                  Восстановить
                </a>
              </p>
              <p>
                Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
              </p>
            </div>
          </form>
        ) : (
          // Password Reset Form
          <form onSubmit={handlePasswordReset} className="auth-form reset-form">
            <h2>Сброс пароля</h2>
            
            {resetSent ? (
              <div className="success-message">
                <p>Инструкции по сбросу пароля отправлены на ваш email.</p>
                <a 
                  href="#"
                  className="auth-button"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowResetForm(false);
                    setResetSent(false);
                    setResetEmail('');
                  }}
                  style={{ textDecoration: 'none', display: 'inline-block' }}
                >
                  Вернуться к входу
                </a>
              </div>
            ) : (
              <>
                <p className="reset-instructions">
                  Введите ваш email и мы отправим инструкции по сбросу пароля.
                </p>
                
                {resetError && <div className="error-message">{resetError}</div>}
                
                <div className="form-group">
                  <label htmlFor="resetEmail">Email</label>
                  <input
                    type="email"
                    id="resetEmail"
                    value={resetEmail}
                    onChange={handleResetEmailChange}
                    placeholder="Введите ваш email"
                    required
                    style={{ backgroundColor: '#d2d0cb' }}
                  />
                </div>
                
                <button 
                  type="submit" 
                  className="nfs-button nfs-button-primary nfs-button-flicker"
                  disabled={loading}
                >
                  <span>{loading ? 'Отправка...' : 'Отправить ссылку'}</span>
                </button>
                
                <p style={{ pointerEvents: loading ? 'none' : 'auto', opacity: loading ? 0.6 : 1 }}>
                  <a 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      setShowResetForm(false);
                    }}
                    style={{ textDecoration: 'none' }}
                  >
                    Назад к входу
                  </a>
                </p>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
