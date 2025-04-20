import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Всегда используем темную тему
  useEffect(() => {
    document.body.classList.add('dark-theme');
    localStorage.setItem('theme', 'dark');
  }, []);
  
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/" className="logo">
          <i className="fas fa-car"></i>
          <span className="logo-text">CarAuction</span>
        </Link>
      </div>
      
      <button className="navbar-toggle" onClick={toggleMenu}>
        <i className={`fas ${isMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
      </button>
      
      <div className={`navbar-menu ${isMenuOpen ? 'is-active' : ''}`}>
        <div className="navbar-start">
          <Link to="/" className="navbar-item" onClick={() => setIsMenuOpen(false)}>
            Главная
          </Link>
          {isAuthenticated && (
            <>
              <Link to="/profile" className="navbar-item" onClick={() => setIsMenuOpen(false)}>
                Мой профиль
              </Link>
              <Link to="/conversations" className="navbar-item" onClick={() => setIsMenuOpen(false)}>
                Диалоги
              </Link>
              <Link to="/create-auction" className="navbar-item" onClick={() => setIsMenuOpen(false)}>
                Создать аукцион
              </Link>
            </>
          )}
        </div>
        
        <div className="navbar-end">
          {isAuthenticated ? (
            <div className="navbar-user">
              <button className="logout-button" onClick={handleLogout}>
                <span><i className="fas fa-sign-out-alt"></i> Выйти</span>
              </button>
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="login-button" onClick={() => setIsMenuOpen(false)}>
                <span>Вход</span>
              </Link>
              <Link to="/register" className="register-button" onClick={() => setIsMenuOpen(false)}>
                <span>Регистрация</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
