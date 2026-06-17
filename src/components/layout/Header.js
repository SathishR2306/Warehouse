// src/components/layout/Header.js
import React, { useState, useRef, useEffect } from 'react';
import { Bell, ChevronDown, User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { logoutUser } from '../../services/auth.service';
import { getInitials, timeAgo } from '../../utils/helpers';
import toast from 'react-hot-toast';

const Header = ({ title, subtitle, notifications = [], onMarkAllRead }) => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [showNotif, setShowNotif] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const notifRef = useRef(null);
  const userRef = useRef(null);

  const unread = notifications.filter((n) => !n.isRead);

  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
      if (userRef.current && !userRef.current.contains(e.target)) setShowUser(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const getNotifIcon = (type) => {
    const colors = {
      low_stock: '#ef4444',
      expiry_alert: '#f59e0b',
      order_update: '#6366f1',
      system: '#64748b',
    };
    return colors[type] || '#6366f1';
  };

  return (
    <header className="header">
      <div className="header-left">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>

      <div className="header-right">
        {/* Notification Bell */}
        <div className="dropdown" ref={notifRef}>
          <button
            className="btn-ghost btn notif-bell"
            onClick={() => { setShowNotif(!showNotif); setShowUser(false); }}
          >
            <Bell size={20} />
            {unread.length > 0 && <span className="notif-dot" />}
          </button>

          {showNotif && (
            <div className="notif-dropdown">
              <div className="notif-header">
                <h3>Notifications {unread.length > 0 && `(${unread.length})`}</h3>
                {unread.length > 0 && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => { onMarkAllRead?.(); }}
                    style={{ fontSize: 11, padding: '4px 8px' }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                  No notifications
                </div>
              ) : (
                notifications.slice(0, 10).map((n) => (
                  <div key={n.id} className={`notif-item ${!n.isRead ? 'unread' : ''}`}>
                    {!n.isRead && (
                      <div className="notif-item-dot" style={{ background: getNotifIcon(n.type) }} />
                    )}
                    <div className="notif-item-content" style={{ marginLeft: n.isRead ? 20 : 0 }}>
                      <div className="notif-item-title">{n.title}</div>
                      <div className="notif-item-msg">{n.message}</div>
                      <div className="notif-item-time">{timeAgo(n.createdAt)}</div>
                    </div>
                  </div>
                ))
              )}

              {notifications.length > 0 && (
                <div
                  style={{ padding: '12px 20px', textAlign: 'center', borderTop: '1px solid #f1f5f9', cursor: 'pointer', fontSize: 13, color: '#6366f1', fontWeight: 600 }}
                  onClick={() => { navigate('/notifications'); setShowNotif(false); }}
                >
                  View all notifications
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Dropdown */}
        <div className="dropdown" ref={userRef}>
          <div
            className="flex items-center gap-2"
            style={{ cursor: 'pointer', padding: '6px 8px', borderRadius: 8, transition: 'background 0.2s' }}
            onClick={() => { setShowUser(!showUser); setShowNotif(false); }}
          >
            <div className="avatar">
              {getInitials(userProfile?.displayName || userProfile?.email || 'U')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                {userProfile?.displayName?.split(' ')[0] || 'User'}
              </span>
              <span style={{ fontSize: 11, color: '#64748b', textTransform: 'capitalize' }}>
                {userProfile?.role}
              </span>
            </div>
            <ChevronDown size={14} color="#64748b" />
          </div>

          {showUser && (
            <div className="dropdown-menu">
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{userProfile?.displayName}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{userProfile?.email}</div>
              </div>
              <div className="dropdown-item" onClick={() => { setShowUser(false); }}>
                <User size={15} /> Profile
              </div>
              <div className="dropdown-divider" />
              <div className="dropdown-item danger" onClick={handleLogout}>
                <LogOut size={15} /> Logout
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
