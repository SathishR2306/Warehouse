// src/pages/dashboards/ManagerDashboard.js
import React, { useMemo } from 'react';
import {
  Package, ShoppingCart, TrendingUp, AlertTriangle, Boxes, Users,
  Plus, ArrowUpRight, ArrowDownRight, Clock, ShieldAlert
} from 'lucide-react';
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Cell
} from 'recharts';
import useWarehouseCollection from '../../hooks/useWarehouseCollection';
import { orderBy, limit, where } from '../../services/firestore.service';
import { timeAgo } from '../../utils/helpers';
import { LOW_STOCK_THRESHOLD } from '../../constants';

const COLORS = ['#0ea5e9', '#6366f1', '#10b981', '#f59e0b', '#ef4444'];

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

const ManagerDashboard = () => {
  const { data: products } = useWarehouseCollection('products', [where('isActive', '==', true)]);
  const { data: inventory } = useWarehouseCollection('inventory');
  const { data: orders } = useWarehouseCollection('orders', [orderBy('createdAt', 'desc'), limit(200)]);
  const { data: transactions } = useWarehouseCollection('inventory_transactions', [orderBy('createdAt', 'desc'), limit(100)]);
  const { data: users } = useWarehouseCollection('users');

  // === Dynamic Analytics ===
  const todayOrders = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return orders.filter((o) => {
      const date = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
      return date >= today;
    });
  }, [orders]);

  const pendingOrders = useMemo(() =>
    orders.filter((o) => ['pending', 'approved', 'picking', 'packing'].includes(o.status)), [orders]);

  const stockMovementsToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return transactions.filter((t) => {
      const date = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
      return date >= today;
    });
  }, [transactions]);

  const staffCount = useMemo(() =>
    users.filter((u) => u.role === 'staff' && u.isActive).length, [users]);

  const lowStockItems = useMemo(() =>
    inventory.filter((i) => {
      const product = products.find((p) => p.id === i.productId);
      return i.quantity <= (product?.reorderPoint || LOW_STOCK_THRESHOLD);
    }), [inventory, products]);

  // Product categories breakdown for visualization
  const categoryChartData = useMemo(() => {
    const catMap = {};
    products.forEach((p) => {
      if (p.category) {
        catMap[p.category] = (catMap[p.category] || 0) + 1;
      }
    });
    return Object.entries(catMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [products]);

  return (
    <div className="manager-dashboard" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KPI Section */}
      <div className="kpi-grid">
        <KpiCard title="Today's Orders" value={todayOrders.length} icon={ShoppingCart} color="indigo" subtitle="Created today" />
        <KpiCard title="Pending Orders" value={pendingOrders.length} icon={Clock} color="amber" subtitle="Awaiting processing" />
        <KpiCard title="Stock Movements Today" value={stockMovementsToday.length} icon={Boxes} color="emerald" subtitle="Inbound / outbound txs" />
        <KpiCard title="Active Staff members" value={staffCount} icon={Users} color="sky" subtitle="Staff under management" />
        <KpiCard title="Low Stock Alerts" value={lowStockItems.length} icon={AlertTriangle} color="rose" subtitle="Products below threshold" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20 }}>
        {/* Recent Inbound/Outbound Activities */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📦 Recent Stock Movements</h3>
          </div>
          <div className="table-wrapper">
            {transactions.length === 0 ? (
              <div className="empty-state" style={{ padding: 40 }}><p>No movements logged yet.</p></div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Location</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 8).map((tx) => {
                    const product = products.find((p) => p.id === tx.productId);
                    return (
                      <tr key={tx.id}>
                        <td>
                          <span className={`badge ${tx.type === 'stock_in' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {tx.type === 'stock_in' ? 'Inbound' : 'Outbound'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{product?.name || '—'}</td>
                        <td>
                          <span style={{ fontWeight: 700, color: tx.type === 'stock_in' ? '#10b981' : '#ef4444' }}>
                            {tx.type === 'stock_in' ? '+' : ''}{tx.quantity}
                          </span>
                        </td>
                        <td>{tx.location || 'Main Floor'}</td>
                        <td style={{ fontSize: 12, color: '#64748b' }}>{timeAgo(tx.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Operational Categories Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📁 Product Categories Count</h3>
          </div>
          <div className="card-body" style={{ padding: 16 }}>
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={categoryChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={70} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]}>
                    {categoryChartData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ padding: 30 }}><p>No categories found.</p></div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Low Stock Watchlist */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">⚠️ Low Stock Watchlist</h3>
            <span className="badge status-low_stock">{lowStockItems.length} Alerts</span>
          </div>
          <div className="table-wrapper">
            {lowStockItems.length === 0 ? (
              <div className="empty-state" style={{ padding: 30 }}><p>All inventory levels healthy.</p></div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Current Qty</th>
                    <th>Reorder Lvl</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.slice(0, 5).map((item) => {
                    const product = products.find((p) => p.id === item.productId);
                    return (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 600 }}>{product?.name || '—'}</td>
                        <td>
                          <span className={item.quantity === 0 ? 'stock-critical' : 'stock-low'}>
                            {item.quantity}
                          </span>
                        </td>
                        <td>{product?.reorderPoint || LOW_STOCK_THRESHOLD}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Staff Members List */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">👥 Staff Under Management</h3>
          </div>
          <div className="table-wrapper">
            {users.filter(u => u.role === 'staff').length === 0 ? (
              <div className="empty-state" style={{ padding: 30 }}><p>No staff accounts registered yet.</p></div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Display Name</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.filter(u => u.role === 'staff').slice(0, 5).map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{s.username}</td>
                      <td>{s.displayName || '—'}</td>
                      <td>
                        <span className={`badge ${s.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
                          {s.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
