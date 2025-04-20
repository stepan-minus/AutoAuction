import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import CreateAuctionPage from '../pages/CreateAuctionPage';
import AuctionPage from '../pages/AuctionPage';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/create-auction" element={<CreateAuctionPage />} />
      <Route path="/auction/:id" element={<AuctionPage />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default AppRoutes;