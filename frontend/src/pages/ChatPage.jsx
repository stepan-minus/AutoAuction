import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';

// В новой архитектуре этот компонент просто перенаправляет на страницу диалогов
const ChatPage = () => {
  useEffect(() => {
    console.log('ChatPage: перенаправление на /conversations');
  }, []);

  return <Navigate to="/conversations" replace />;
};

export default ChatPage;