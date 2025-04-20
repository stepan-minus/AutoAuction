import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RequireAuth = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  // If authentication is still loading, render a loading indicator
  if (loading) {
    return <div className="loading-auth">Загрузка...</div>;
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: window.location }} />;
  }

  // If authenticated, render the children
  return children;
};

export default RequireAuth;