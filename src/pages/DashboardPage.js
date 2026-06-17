// src/pages/DashboardPage.js — Role-based dashboard router
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import AdminDashboard from './dashboards/AdminDashboard';
import ManagerDashboard from './dashboards/ManagerDashboard';
import StaffDashboard from './dashboards/StaffDashboard';

const DashboardPage = () => {
  const { role } = useAuth();

  if (role === 'admin') return <AdminDashboard />;
  if (role === 'manager') return <ManagerDashboard />;
  return <StaffDashboard />;
};

export default DashboardPage;
