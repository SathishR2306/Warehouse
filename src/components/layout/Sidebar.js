// src/components/layout/Sidebar.js
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Layers, Building2, Users, Tag,
  ShoppingCart, Bell, FileText, LogOut, Boxes, UserCog
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { logoutUser } from '../../services/auth.service';
import { getInitials } from '../../utils/helpers';
import toast from 'react-hot-toast';
import usePermissions from '../../hooks/usePermissions';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/', exact: true, requiredRole: 'staff' },
  { section: 'Inventory' },
  { label: 'Products', icon: Package, path: '/products', requiredRole: 'staff' },
  { label: 'Categories', icon: Tag, path: '/categories', requiredRole: 'staff' },
  { label: 'Inventory', icon: Layers, path: '/inventory', requiredRole: 'staff' },
  { section: 'Operations' },
  { label: 'Warehouses', icon: Building2, path: '/warehouses', requiredRole: 'admin' },
  { label: 'Suppliers', icon: Users, path: '/suppliers', requiredRole: 'staff' },
  { label: 'Orders', icon: ShoppingCart, path: '/orders', requiredRole: 'staff' },
  { section: 'System' },
  { label: 'User Management', icon: UserCog, path: '/users', requiredRole: 'manager' },
  { label: 'Notifications', icon: Bell, path: '/notifications', requiredRole: 'staff', badge: true },
  { label: 'Audit Logs', icon: FileText, path: '/audit-logs', requiredRole: 'admin' },
];

const Sidebar = ({ unreadCount = 0 }) => {
  const { userProfile } = useAuth();
  const { requireRole } = usePermissions();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logoutUser();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (err) {
      toast.error('Logout failed');
    }
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Boxes size={22} color="white" />
        </div>
        <div className="sidebar-logo-text">
          <h2>WareFlow</h2>
          <p style={{ fontSize: 10, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ID: {userProfile?.warehouseId || 'Global'}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item, idx) => {
          if (item.section) {
            return (
              <div key={idx} className="nav-section-label">{item.section}</div>
            );
          }

          if (!requireRole(item.requiredRole)) return null;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <item.icon size={18} />
              {item.label}
              {item.badge && unreadCount > 0 && (
                <span className="nav-item-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User info at bottom */}
      <div className="sidebar-user" onClick={handleLogout} title="Click to logout">
        <div className="avatar" style={{ width: 34, height: 34, fontSize: 12 }}>
          {getInitials(userProfile?.displayName || userProfile?.email || 'U')}
        </div>
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">
            {userProfile?.displayName || userProfile?.email?.split('@')[0]}
          </div>
          <div className="sidebar-user-role">{userProfile?.role || 'Staff'}</div>
        </div>
        <LogOut size={16} color="#64748b" />
      </div>
    </aside>
  );
};

export default Sidebar;
