// src/pages/dashboards/AdminDashboard.js
import React, { useMemo } from 'react';
import {
  Package, ShoppingCart, TrendingUp, AlertTriangle, Boxes, Users,
  DollarSign, BarChart3, Clock, Archive
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import useWarehouseCollection from '../../hooks/useWarehouseCollection';
import { orderBy, limit, where } from '../../services/firestore.service';
import { formatCurrency, timeAgo } from '../../utils/helpers';
import { StatusBadge } from '../../components/common/Badge';
import { LOW_STOCK_THRESHOLD } from '../../constants';

const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const KpiCard = ({ title, value, subtitle, icon: Icon, color }) => (
  <div className={`kpi-card ${color}`}>
    <div className={`kpi-icon ${color}`}>
      <Icon size={22} />
    </div>
    <div className="kpi-info">
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{title}</div>
      {subtitle && <div className="kpi-trend">{subtitle}</div>}
    </div>
  </div>
);

const AdminDashboard = () => {
  const { data: products } = useWarehouseCollection('products', [where('isActive', '==', true)]);
  const { data: inventory } = useWarehouseCollection('inventory');
  const { data: orders } = useWarehouseCollection('orders', [orderBy('createdAt', 'desc'), limit(200)]);
  const { data: transactions } = useWarehouseCollection('inventory_transactions', [orderBy('createdAt', 'desc'), limit(200)]);
  const { data: suppliers } = useWarehouseCollection('suppliers', [where('isActive', '==', true)]);
  const { data: users } = useWarehouseCollection('users');

  // === Computed Analytics (all dynamic) ===
  const lowStockItems = useMemo(() =>
    inventory.filter((i) => {
      const product = products.find((p) => p.id === i.productId);
      return i.quantity <= (product?.reorderPoint || LOW_STOCK_THRESHOLD);
    }), [inventory, products]);

  const totalStock = useMemo(() =>
    inventory.reduce((sum, i) => sum + (i.quantity || 0), 0), [inventory]);

  const inventoryValue = useMemo(() =>
    inventory.reduce((sum, inv) => {
      const product = products.find((p) => p.id === inv.productId);
      return sum + (inv.quantity || 0) * (product?.costPrice || 0);
    }, 0), [inventory, products]);

  const deliveredOrders = useMemo(() =>
    orders.filter((o) => o.status === 'delivered'), [orders]);

  const revenue = useMemo(() =>
    deliveredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0), [deliveredOrders]);

  const pendingOrders = useMemo(() =>
    orders.filter((o) => ['pending', 'approved', 'picking', 'packing'].includes(o.status)), [orders]);

  const activeUsers = useMemo(() =>
    users.filter((u) => u.isActive), [users]);

  // Stock movement chart — group transactions by day (last 7 days)
  const stockMovementData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      days.push({
        date: d,
        day: d.toLocaleDateString('en', { weekday: 'short' }),
        stockIn: 0,
        stockOut: 0,
      });
    }
    transactions.forEach((tx) => {
      const txDate = tx.createdAt?.toDate ? tx.createdAt.toDate() : new Date(tx.createdAt);
      if (!txDate) return;
      txDate.setHours(0, 0, 0, 0);
      const dayEntry = days.find((d) => d.date.getTime() === txDate.getTime());
      if (dayEntry) {
        if (tx.type === 'stock_in') dayEntry.stockIn += Math.abs(tx.quantity || 0);
        if (tx.type === 'stock_out') dayEntry.stockOut += Math.abs(tx.quantity || 0);
      }
    });
    return days.map(({ day, stockIn, stockOut }) => ({ day, stockIn, stockOut }));
  }, [transactions]);

  // Order status breakdown
  const orderStatusData = useMemo(() => {
    const statusMap = {};
    orders.forEach((o) => {
      const s = o.status;
      if (s && s !== 'cancelled') {
        statusMap[s] = (statusMap[s] || 0) + 1;
      }
    });
    return Object.entries(statusMap).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));
  }, [orders]);

  // Top products by stock
  const topProducts = useMemo(() =>
    inventory
      .map((inv) => ({
        ...inv,
        product: products.find((p) => p.id === inv.productId),
      }))
      .filter((inv) => inv.product)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 6),
    [inventory, products]);

  // Fast-moving products (highest stock_out volume)
  const fastMoving = useMemo(() => {
    const outMap = {};
    transactions.forEach((tx) => {
      if (tx.type === 'stock_out') {
        outMap[tx.productId] = (outMap[tx.productId] || 0) + Math.abs(tx.quantity || 0);
      }
    });
    return Object.entries(outMap)
      .map(([productId, totalOut]) => ({
        product: products.find((p) => p.id === productId),
        totalOut,
      }))
      .filter((x) => x.product)
      .sort((a, b) => b.totalOut - a.totalOut)
      .slice(0, 5);
  }, [transactions, products]);

  // Dead stock (products with no transactions)
  const deadStock = useMemo(() => {
    const transactedIds = new Set(transactions.map((tx) => tx.productId));
    return products.filter((p) => !transactedIds.has(p.id)).slice(0, 5);
  }, [transactions, products]);

  return (
    <div className="admin-dashboard">
      {/* KPI Cards */}
      <div className="kpi-grid">
        <KpiCard title="Total Products" value={products.length} icon={Package} color="indigo"
          subtitle={`${suppliers.length} suppliers`} />
        <KpiCard title="Total Stock" value={totalStock.toLocaleString()} icon={Boxes} color="emerald"
          subtitle="Units across all shelves" />
        <KpiCard title="Inventory Value" value={formatCurrency(inventoryValue)} icon={DollarSign} color="sky"
          subtitle="Current stock value" />
        <KpiCard title="Revenue" value={formatCurrency(revenue)} icon={TrendingUp} color="violet"
          subtitle={`${deliveredOrders.length} delivered orders`} />
        <KpiCard title="Active Orders" value={pendingOrders.length} icon={ShoppingCart} color="amber"
          subtitle={`${orders.length} total orders`} />
        <KpiCard title="Low Stock Alerts" value={lowStockItems.length} icon={AlertTriangle} color="rose"
          subtitle={lowStockItems.length > 0 ? 'Needs attention' : 'All stocked'} />
        <KpiCard title="Team Members" value={activeUsers.length} icon={Users} color="indigo"
          subtitle={`${users.filter(u => u.role === 'manager').length} managers, ${users.filter(u => u.role === 'staff').length} staff`} />
      </div>

      {/* Charts Row */}
      <div className="charts-grid">
        {/* Stock Movement Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📦 Stock Movement (7 Days)</h3>
            <div className="flex gap-2">
              <span className="badge" style={{ background: '#d1fae5', color: '#065f46', fontSize: 11 }}>● In</span>
              <span className="badge" style={{ background: '#fee2e2', color: '#991b1b', fontSize: 11 }}>● Out</span>
            </div>
          </div>
          <div className="card-body" style={{ padding: '16px 20px' }}>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={stockMovementData}>
                <defs>
                  <linearGradient id="adminStockIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="adminStockOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Area type="monotone" dataKey="stockIn" stroke="#6366f1" strokeWidth={2} fill="url(#adminStockIn)" name="Stock In" />
                <Area type="monotone" dataKey="stockOut" stroke="#ef4444" strokeWidth={2} fill="url(#adminStockOut)" name="Stock Out" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Status Donut */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🛒 Order Pipeline</h3>
          </div>
          <div className="card-body" style={{ padding: '16px 20px' }}>
            {orderStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={orderStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                    {orderStatusData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ padding: 40 }}>
                <p>No orders yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mid Row: Top Products + Fast Moving */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Top Products */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📊 Top Products by Stock</h3>
          </div>
          <div className="card-body" style={{ padding: '16px 20px' }}>
            {topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topProducts.map(i => ({ name: i.product?.name?.slice(0, 12) || '—', qty: i.quantity }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                  <Bar dataKey="qty" name="Quantity" radius={[6, 6, 0, 0]}>
                    {topProducts.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ padding: 30 }}><p>No inventory data</p></div>
            )}
          </div>
        </div>

        {/* Fast Moving Products */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🚀 Fast-Moving Products</h3>
          </div>
          <div className="table-wrapper">
            {fastMoving.length === 0 ? (
              <div className="empty-state" style={{ padding: 40 }}><p>No movement data yet</p></div>
            ) : (
              <table className="table">
                <thead><tr><th>Product</th><th>Total Out</th><th>Velocity</th></tr></thead>
                <tbody>
                  {fastMoving.map((fm, idx) => (
                    <tr key={fm.product.id}>
                      <td style={{ fontWeight: 600, fontSize: 13 }}>{fm.product.name}</td>
                      <td><span style={{ fontWeight: 700, color: '#ef4444' }}>{fm.totalOut}</span></td>
                      <td>
                        <div className="progress-bar" style={{ width: 80 }}>
                          <div className="progress-bar-fill" style={{
                            width: `${Math.min((fm.totalOut / (fastMoving[0]?.totalOut || 1)) * 100, 100)}%`,
                            background: COLORS[idx % COLORS.length]
                          }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Low Stock + Dead Stock + Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
        {/* Low Stock */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">⚠️ Low Stock</h3>
            <span className="badge status-low_stock">{lowStockItems.length}</span>
          </div>
          <div className="table-wrapper">
            {lowStockItems.length === 0 ? (
              <div className="empty-state" style={{ padding: 30 }}>
                <div className="empty-state-icon">✅</div>
                <h3>All stocked</h3>
              </div>
            ) : (
              <table className="table">
                <thead><tr><th>Product</th><th>Qty</th></tr></thead>
                <tbody>
                  {lowStockItems.slice(0, 8).map((item) => {
                    const product = products.find((p) => p.id === item.productId);
                    return (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 600, fontSize: 13 }}>{product?.name || '—'}</td>
                        <td><span className={item.quantity === 0 ? 'stock-critical' : 'stock-low'}>{item.quantity}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Dead Stock */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><Archive size={16} style={{ marginRight: 6 }} />Dead Stock</h3>
            <span className="badge" style={{ background: '#f1f5f9', color: '#475569' }}>{deadStock.length}</span>
          </div>
          <div className="table-wrapper">
            {deadStock.length === 0 ? (
              <div className="empty-state" style={{ padding: 30 }}>
                <h3>No dead stock</h3>
                <p style={{ fontSize: 12 }}>All products have movement</p>
              </div>
            ) : (
              <table className="table">
                <thead><tr><th>Product</th><th>SKU</th></tr></thead>
                <tbody>
                  {deadStock.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</td>
                      <td style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>{p.sku || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🔄 Recent Activity</h3>
          </div>
          <div className="table-wrapper">
            {transactions.length === 0 ? (
              <div className="empty-state" style={{ padding: 30 }}>
                <div className="empty-state-icon"><Clock size={20} /></div>
                <h3>No activity</h3>
              </div>
            ) : (
              <table className="table">
                <thead><tr><th>Type</th><th>Product</th><th>Qty</th><th>Time</th></tr></thead>
                <tbody>
                  {transactions.slice(0, 8).map((tx) => {
                    const product = products.find((p) => p.id === tx.productId);
                    return (
                      <tr key={tx.id}>
                        <td><StatusBadge status={tx.type} /></td>
                        <td style={{ fontWeight: 500, fontSize: 13 }}>{product?.name || '—'}</td>
                        <td>
                          <span style={{ fontWeight: 600, color: tx.type === 'stock_in' ? '#10b981' : '#ef4444' }}>
                            {tx.quantity > 0 ? '+' : ''}{tx.quantity}
                          </span>
                        </td>
                        <td style={{ fontSize: 11, color: '#64748b' }}>{timeAgo(tx.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
