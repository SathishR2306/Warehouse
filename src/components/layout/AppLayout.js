// src/components/layout/AppLayout.js
import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../contexts/AuthContext';
import useWarehouseCollection from '../../hooks/useWarehouseCollection';
import { markAllAsRead } from '../../services/notification.service';
import { orderBy, limit } from '../../services/firestore.service';

const pageInfo = {
  '/': { title: 'Dashboard', subtitle: 'Overview of warehouse operations' },
  '/products': { title: 'Products', subtitle: 'Manage your product catalog' },
  '/categories': { title: 'Categories', subtitle: 'Organize products by category' },
  '/inventory': { title: 'Inventory', subtitle: 'Track stock levels and movements' },
  '/warehouses': { title: 'Warehouses', subtitle: 'Manage warehouse locations and shelves' },
  '/suppliers': { title: 'Suppliers', subtitle: 'Manage supplier information' },
  '/orders': { title: 'Orders', subtitle: 'Purchase and sales order management' },
  '/notifications': { title: 'Notifications', subtitle: 'Alerts and system messages' },
  '/users': { title: 'User Management', subtitle: 'Manage team members and access control' },
  '/audit-logs': { title: 'Audit Logs', subtitle: 'Track all system activities' },
};

const AppLayout = () => {
  const { userProfile } = useAuth();
  const path = window.location.pathname;
  const info = pageInfo[path] || { title: 'WareFlow', subtitle: '' };

  const { data: notifications } = useWarehouseCollection(
    'notifications',
    [orderBy('createdAt', 'desc'), limit(50)]
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead(userProfile?.uid);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar unreadCount={unreadCount} />
      <div className="main-content">
        <Header
          title={info.title}
          subtitle={info.subtitle}
          notifications={notifications}
          onMarkAllRead={handleMarkAllRead}
        />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
