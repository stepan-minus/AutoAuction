import React from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';

const Success = () => {
  const location = useLocation();
  
  // Если страница загружена напрямую без передачи state, перенаправляем на главную
  if (!location.state || !location.state.message) {
    return <Navigate to="/" replace />;
  }
  
  const { message, backPath, backText } = location.state;
  
  return (
    <div className="success-page">
      <div className="success-container">
        <div className="success-icon">
          <i className="fas fa-check-circle"></i>
        </div>
        
        <h1 className="success-title">Успешно!</h1>
        <div className="success-message">
          <span className="success-message-content">{message}</span>
        </div>
        
        <div className="success-actions">
          <Link to={backPath || '/'} className="primary-button">
            <span style={{ transform: 'skew(5deg)', display: 'inline-block' }}>
              {backText || 'Вернуться на главную'}
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Success;