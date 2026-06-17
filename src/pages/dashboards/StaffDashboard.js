// src/pages/dashboards/StaffDashboard.js
import React, { useMemo } from 'react';
import {
  Package, ShoppingCart, AlertTriangle, Boxes, Clock, Bell, RefreshCw
} from 'lucide-react';
import useWarehouseCollection from '../../hooks/useWarehouseCollection';
import { orderBy, limit, where } from '../../services/firestore.service';
import { timeAgo } from '../../utils/helpers';
import { StatusBadge } from '../../components/common/Badge';
import { LOW_STOCK_THRESHOLD } from '../../constants';

const KpiCard = ({ title, value, icon: Icon, color, subtitle }) => (
  <div className={`kpi-card ${color}`}>
    <div className={`kpi-icon ${color}`}>
      <Icon size={22} />
    </div>
    <div className="kpi-info">
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{title}</div>
      {subtitle && <div className="kpi-trend" style={{ opacity: 0.8, fontSize: '11px' }}>{subtitle}</div>}
    </div>
  </div>
);

const StaffDashboard = () => {
  const { data: products } = useWarehouseCollection('products', [where('isActive', '==', true)]);
  const { data: inventory } = useWarehouseCollection('inventory');
  const { data: orders } = useWarehouseCollection('orders', [orderBy('createdAt', 'desc'), limit(100)]);
  const { data: notifications } = useWarehouseCollection('notifications', [orderBy('createdAt', 'desc'), limit(50)]);

  // === Dynamic Calculations ===
  const lowStockCount = useMemo(() =>
    inventory.filter((i) => {
      const product = products.find((p) => p.id === i.productId);
      return i.quantity <= (product?.reorderPoint || LOW_STOCK_THRESHOLD);
    }).length, [inventory, products]);

  const assignedTasksCount = useMemo(() =>
    orders.filter((o) => ['picking', 'packing'].includes(o.status)).length, [orders]);

  const todayOrdersCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return orders.filter((o) => {
      const date = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
      return date >= today;
    }).length;
  }, [orders]);

  const unreadNotificationsCount = useMemo(() =>
    notifications.filter(n => !n.isRead).length, [notifications]);

  return (
    <div className="staff-dashboard" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KPI Section */}
      <div className="kpi-grid">
        <KpiCard title="Assigned Tasks" value={assignedTasksCount} icon={Package} color="indigo" subtitle="Picking & Packing orders" />
        <KpiCard title="Today's Orders" value={todayOrdersCount} icon={ShoppingCart} color="sky" subtitle="Created today" />
        <KpiCard title="Low Stock Items" value={lowStockCount} icon={AlertTriangle} color="rose" subtitle="Requires replenishment check" />
        <KpiCard title="New Notifications" value={unreadNotificationsCount} icon={Bell} color="amber" subtitle="Awaiting view" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20 }}>
        {/* Active Tasks list (Picking/Packing Orders) */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📋 Active Picking & Packing Tasks</h3>
          </div>
          <div className="table-wrapper">
            {orders.filter(o => ['picking', 'packing'].includes(o.status)).length === 0 ? (
              <div className="empty-state" style={{ padding: 40 }}><p>No pending operational tasks assigned.</p></div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.filter(o => ['picking', 'packing'].includes(o.status)).slice(0, 8).map((ord) => (
                    <tr key={ord.id}>
                      <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>#{ord.id.slice(0, 8)}</td>
                      <td>{ord.customerName || '—'}</td>
                      <td>
                        <span className={`badge ${ord.status === 'picking' ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}>
                          {ord.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: '#64748b' }}>{timeAgo(ord.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Quick Notifications Center */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🔔 Recent Alerts</h3>
          </div>
          <div className="card-body" style={{ padding: '8px 16px', maxHeight: 350, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div className="empty-state" style={{ padding: 30 }}><p>No recent alerts.</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {notifications.slice(0, 5).map((n) => (
                  <div key={n.id} style={{
                    padding: 12,
                    borderRadius: 8,
                    background: n.isRead ? '#f8fafc' : '#f1f5f9',
                    borderLeft: `4px solid ${n.type === 'low_stock' ? '#ef4444' : '#6366f1'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4
                  }}>
                    <span style={{ fontWeight: n.isRead ? 500 : 700, fontSize: 13 }}>{n.title}</span>
                    <span style={{ fontSize: 11, color: '#64748b' }}>{n.message}</span>
                    <span style={{ fontSize: 9, color: '#94a3b8', alignSelf: 'flex-end' }}>{timeAgo(n.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
