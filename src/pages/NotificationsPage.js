/* eslint-disable no-unused-vars */
// src/pages/NotificationsPage.js
import React, { useState } from 'react';
import { Bell, Check, CheckCheck, Trash2, Package, AlertTriangle, ShoppingCart, Info } from 'lucide-react';
import useWarehouseCollection from '../hooks/useWarehouseCollection';
import { orderBy } from '../services/firestore.service';
import { markAsRead, markAllAsRead, deleteNotification, createNotification } from '../services/notification.service';
import { StatusBadge } from '../components/common/Badge';
import { timeAgo, formatDateTime } from '../utils/helpers';
import { NOTIFICATION_TYPES } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const typeIcons = {
  [NOTIFICATION_TYPES.LOW_STOCK]: { icon: Package, color: '#ef4444', bg: '#fef2f2' },
  [NOTIFICATION_TYPES.EXPIRY_ALERT]: { icon: AlertTriangle, color: '#f59e0b', bg: '#fffbeb' },
  [NOTIFICATION_TYPES.ORDER_UPDATE]: { icon: ShoppingCart, color: '#6366f1', bg: '#f0f9ff' },
  [NOTIFICATION_TYPES.SYSTEM]: { icon: Info, color: '#64748b', bg: '#f8fafc' },
};

const NotificationsPage = () => {
  const { userProfile } = useAuth();
  const [activeFilter, setActiveFilter] = useState('all');
  const { data: notifications, loading } = useWarehouseCollection('notifications', [orderBy('createdAt', 'desc')]);

  const filtered = notifications.filter((n) => {
    if (activeFilter === 'unread') return !n.isRead;
    if (activeFilter === 'low_stock') return n.type === NOTIFICATION_TYPES.LOW_STOCK;
    if (activeFilter === 'orders') return n.type === NOTIFICATION_TYPES.ORDER_UPDATE;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkRead = async (id) => {
    try { await markAsRead(id); }
    catch (err) { toast.error('Failed'); }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead(userProfile?.uid);
      toast.success('All marked as read');
    } catch (err) {
      toast.error('Failed');
    }
  };

  const handleDelete = async (id) => {
    try { await deleteNotification(id); toast.success('Notification deleted'); }
    catch (err) { toast.error('Failed to delete'); }
  };

  const handleTestNotification = async () => {
    await createNotification({
      type: NOTIFICATION_TYPES.SYSTEM,
      title: 'Test Notification',
      message: 'This is a test notification from WareFlow.',
      priority: 'low',
    });
    toast.success('Test notification created!');
  };

  return (
    <div>
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="tabs" style={{ marginBottom: 0, flex: 1 }}>
          {[
            { key: 'all', label: `All (${notifications.length})` },
            { key: 'unread', label: `Unread (${unreadCount})` },
            { key: 'low_stock', label: '⚠️ Low Stock' },
            { key: 'orders', label: '🛒 Orders' },
          ].map((tab) => (
            <div key={tab.key} className={`tab ${activeFilter === tab.key ? 'active' : ''}`} onClick={() => setActiveFilter(tab.key)}>
              {tab.label}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {unreadCount > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={handleMarkAllRead} id="btn-mark-all-read">
              <CheckCheck size={14} /> Mark All Read
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={handleTestNotification} id="btn-test-notif">
            <Bell size={14} /> Test Alert
          </button>
        </div>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding: 60 }}>
            <div className="empty-state-icon"><Bell size={28} /></div>
            <h3>No notifications</h3>
            <p>{activeFilter === 'unread' ? 'You\'re all caught up!' : 'Notifications will appear here'}</p>
          </div>
        </div>
      ) : (
        <div className="card">
          {filtered.map((n, idx) => {
            const typeInfo = typeIcons[n.type] || typeIcons[NOTIFICATION_TYPES.SYSTEM];
            const Icon = typeInfo.icon;

            return (
              <div
                key={n.id}
                style={{
                  display: 'flex',
                  gap: 16,
                  padding: '16px 20px',
                  borderBottom: idx < filtered.length - 1 ? '1px solid #f1f5f9' : 'none',
                  background: n.isRead ? 'white' : '#f0f9ff',
                  transition: 'background 0.2s',
                }}
              >
                {/* Icon */}
                <div style={{ width: 44, height: 44, borderRadius: 12, background: typeInfo.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={20} color={typeInfo.color} />
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{n.title}</span>
                        {!n.isRead && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#6366f1', display: 'inline-block', flexShrink: 0 }} />}
                        {n.priority === 'critical' && <span className="badge" style={{ background: '#fee2e2', color: '#991b1b', fontSize: 10 }}>Critical</span>}
                        {n.priority === 'high' && <span className="badge" style={{ background: '#ffedd5', color: '#9a3412', fontSize: 10 }}>High</span>}
                      </div>
                      <p style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>{n.message}</p>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                        {timeAgo(n.createdAt)} · {formatDateTime(n.createdAt)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      {!n.isRead && (
                        <button className="btn btn-ghost btn-icon-only" onClick={() => handleMarkRead(n.id)} title="Mark as read" id={`mark-read-${n.id}`}>
                          <Check size={15} />
                        </button>
                      )}
                      <button className="btn btn-ghost btn-icon-only" style={{ color: '#ef4444' }} onClick={() => handleDelete(n.id)} title="Delete" id={`delete-notif-${n.id}`}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
