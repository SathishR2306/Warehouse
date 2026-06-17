// src/components/common/ProtectedRoute.js
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingScreen from './LoadingScreen';
// eslint-disable-next-line no-unused-vars

const ProtectedRoute = ({ requiredRole }) => {
  const { user, userProfile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  if (requiredRole) {
    const hierarchy = { admin: 3, manager: 2, staff: 1 };
    const userLevel = hierarchy[userProfile?.role] || 0;
    const requiredLevel = hierarchy[requiredRole] || 0;
    if (userLevel < requiredLevel) {
      return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
