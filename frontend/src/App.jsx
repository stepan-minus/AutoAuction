import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AuctionPage from './pages/AuctionPage';
import ProfilePage from './pages/ProfilePage';
import SellerProfilePage from './pages/SellerProfilePage';
import CreateAuctionPage from './pages/CreateAuctionPage';
import ChatPage from './pages/ChatPage';
import ConversationsPage from './pages/ConversationsPage';
import MessagePage from './pages/MessagePage';
import Success from './pages/Success';
import NotificationManager from './components/notifications/NotificationManager';
import NotificationListener from './components/notifications/NotificationListener';
import routes from './routes';

// Импортируем все стили из единой точки входа
import './styles/index.css';

// Переопределяем текстовые константы на русском
window.APP_STRINGS = {
  common: {
    loading: 'Загрузка...',
    error: 'Ошибка',
    success: 'Успешно',
    save: 'Сохранить',
    cancel: 'Отмена',
    create: 'Создать',
    edit: 'Редактировать',
    delete: 'Удалить',
    view: 'Просмотр',
    search: 'Поиск',
    filter: 'Фильтр'
  },
  auth: {
    login: 'Войти',
    register: 'Регистрация',
    logout: 'Выйти',
    email: 'Email',
    password: 'Пароль',
    confirmPassword: 'Подтвердите пароль'
  },
  auction: {
    createAuction: 'Создать аукцион',
    myAuctions: 'Мои аукционы',
    allAuctions: 'Все аукционы',
    title: 'Название',
    description: 'Описание',
    startPrice: 'Начальная цена',
    currentPrice: 'Текущая цена',
    endDate: 'Дата окончания',
    createBid: 'Сделать ставку',
    bidAmount: 'Сумма ставки',
    noBids: 'Нет ставок'
  }
};

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  // If authentication is still loading, render nothing or a loading indicator
  if (loading) {
    return <div className="loading-auth">Loading...</div>;
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: window.location }} />;
  }

  // If authenticated, render the children
  return children;
};

const App = () => {
  // Apply saved theme preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-theme');
    }
  }, []);

  return (
    <Router>
      <AuthProvider>
        <div className="app">
          <Navbar />
          <NotificationManager />
          {/* Слушатель уведомлений о перебитых ставках и выигрышах аукционов */}
          <NotificationListener />
          <main>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/auction/:id" element={<AuctionPage />} />
              <Route path="/seller/:id" element={<SellerProfilePage />} />
              <Route path="/create-auction" element={<CreateAuctionPage />} />
              <Route path="/success" element={<Success />} />

              {/* Protected routes */}
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/chat" 
                element={
                  <ProtectedRoute>
                    <Navigate to="/conversations" replace />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/conversations" 
                element={
                  <ProtectedRoute>
                    <ConversationsPage />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/messages/:conversationId" 
                element={
                  <ProtectedRoute>
                    <MessagePage />
                  </ProtectedRoute>
                } 
              />

              {/* 404 route */}
              <Route 
                path="*" 
                element={
                  <div className="not-found">
                    <h1>404 - Page Not Found</h1>
                    <p>The page you're looking for doesn't exist.</p>
                    <button onClick={() => window.history.back()}>
                      Go Back
                    </button>
                  </div>
                } 
              />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </Router>
  );
};

export default App;