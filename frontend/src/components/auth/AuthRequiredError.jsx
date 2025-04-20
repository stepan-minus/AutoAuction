import React from 'react';
import { Link } from 'react-router-dom';

const AuthRequiredError = ({ message, returnPath = '/' }) => {
  return (
    <div className="error-page">
      <div className="error-container">
        <h2>Ограниченный доступ</h2>
        <p>{message || 'Для просмотра лота, вам надо зайти или зарегистрироваться'}</p>
        
        <div className="auth-options">
          <div className="auth-buttons">
            <Link to="/login" className="auth-button login-button">
              Войти
            </Link>
            <Link to="/register" className="auth-button register-button">
              Зарегистрироваться
            </Link>
          </div>
        </div>
        
        <Link to={returnPath} className="auth-button login-button" style={{ marginTop: '15px' }}>
          Вернуться на главную
        </Link>
      </div>
    </div>
  );
};

export default AuthRequiredError;