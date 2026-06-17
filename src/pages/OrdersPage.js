/* eslint-disable no-unused-vars */
// src/pages/OrdersPage.js
import React, { useState } from 'react';
import { Plus, Eye, Edit2, Trash2, ShoppingCart, Package, Search, Filter, CheckCircle, XCircle, Truck, ArrowRight } from 'lucide-react';
import useWarehouseCollection from '../hooks/useWarehouseCollection';
import { where, orderBy } from '../services/firestore.service';
import { createOrder, getOrderItems, updateOrderStatus, cancelOrder } from '../services/order.service';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { StatusBadge } from '../components/common/Badge';
import { formatCurrency, formatDateTime, generateOrderNumber } from '../utils/helpers';
import { ORDER_STATUS, ORDER_TYPES } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import usePermissions from '../hooks/usePermissions';
import toast from 'react-hot-toast';

const STATUS_FLOW = {
  [ORDER_STATUS.PENDING]: ORDER_STATUS.APPROVED,
  [ORDER_STATUS.APPROVED]: ORDER_STATUS.PICKING,
  [ORDER_STATUS.PICKING]: ORDER_STATUS.PACKING,
  [ORDER_STATUS.PACKING]: ORDER_STATUS.DISPATCHED,
  [ORDER_STATUS.DISPATCHED]: ORDER_STATUS.DELIVERED,
};

const STATUS_LABELS = {
  approved: 'Approve',
  picking: 'Start Picking',
  packing: 'Start Packing',
  dispatched: 'Dispatch Order',
  delivered: 'Deliver Order',
};

const OrdersPage = () => {
  const { userProfile, role } = useAuth();
  const { can } = usePermissions();
  const [activeType, setActiveType] = useState('');
  const [activeStatus, setActiveStatus] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [viewOrder, setViewOrder] = useState(null);
  const [viewOrderItems, setViewOrderItems] = useState([]);
  const [cancelOrderItem, setCancelOrderItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);

  const [form, setForm] = useState({
    type: ORDER_TYPES.PURCHASE, supplierId: '', warehouseId: '', notes: '', expectedDate: '',
  });
  const [orderItems, setOrderItems] = useState([{ productId: '', quantity: 1, unitPrice: 0 }]);

  const { data: orders } = useWarehouseCollection('orders', [orderBy('createdAt', 'desc')]);
  const { data: products } = useWarehouseCollection('products', [where('isActive', '==', true)]);
  const { data: suppliers } = useWarehouseCollection('suppliers', [where('isActive', '==', true)]);
  const { data: warehouses } = useWarehouseCollection('warehouses', [where('isActive', '==', true)]);

  const filteredOrders = orders.filter((o) => {
    const matchType = !activeType || o.type === activeType;
    const matchStatus = !activeStatus || o.status === activeStatus;
    const matchSearch = !search || o.orderNumber?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchStatus && matchSearch;
  });

  const openViewOrder = async (order) => {
    setViewOrder(order);
    setLoadingItems(true);
    try {
      const items = await getOrderItems(order.id);
      setViewOrderItems(items);
    } catch (err) {
      toast.error('Failed to load order items');
    } finally {
      setLoadingItems(false);
    }
  };

  const handleAdvanceStatus = async (order) => {
    const nextStatus = STATUS_FLOW[order.status];
    if (!nextStatus) return;
    try {
      await updateOrderStatus(order.id, nextStatus, userProfile?.uid);
      toast.success(`Order ${nextStatus}!`);
      if (viewOrder?.id === order.id) setViewOrder({ ...viewOrder, status: nextStatus });
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    const validItems = orderItems.filter((i) => i.productId && i.quantity > 0);
    if (validItems.length === 0) { toast.error('Add at least one product'); return; }
    setSubmitting(true);
    try {
      await createOrder({ ...form, createdBy: userProfile?.uid }, validItems);
      toast.success('Order created!');
      setShowForm(false);
      setForm({ type: ORDER_TYPES.PURCHASE, supplierId: '', warehouseId: '', notes: '', expectedDate: '' });
      setOrderItems([{ productId: '', quantity: 1, unitPrice: 0 }]);
    } catch (err) {
      toast.error('Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    try {
      await cancelOrder(cancelOrderItem.id, 'Manually cancelled', userProfile?.uid);
      toast.success('Order cancelled');
      setCancelOrderItem(null);
    } catch (err) {
      toast.error('Failed to cancel order');
    }
  };

  const addOrderItem = () => setOrderItems([...orderItems, { productId: '', quantity: 1, unitPrice: 0 }]);
  const removeOrderItem = (idx) => setOrderItems(orderItems.filter((_, i) => i !== idx));
  const updateOrderItem = (idx, field, value) => {
    const updated = [...orderItems];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === 'productId') {
      const product = products.find((p) => p.id === value);
      if (product) updated[idx].unitPrice = product.costPrice || 0;
    }
    setOrderItems(updated);
  };

  const orderTotal = orderItems.reduce((sum, i) => sum + (i.quantity || 0) * (i.unitPrice || 0), 0);

  const getSupplierName = (id) => suppliers.find((s) => s.id === id)?.name || '—';
  const getWarehouseName = (id) => warehouses.find((w) => w.id === id)?.name || '—';
  const getProductName = (id) => products.find((p) => p.id === id)?.name || '—';

  return (
    <div>
      {/* Tabs + Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="tabs" style={{ marginBottom: 0, flex: 1 }}>
          {['', 'purchase', 'sales'].map((t) => (
            <div key={t} className={`tab ${activeType === t ? 'active' : ''}`} onClick={() => setActiveType(t)}>
              {t === '' ? 'All Orders' : t === 'purchase' ? '📥 Purchase' : '📤 Sales'}
            </div>
          ))}
        </div>
        {can.manageOrders && role !== 'staff' && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)} id="btn-create-order">
            <Plus size={16} /> Create Order
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ padding: '12px 16px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1 }}>
            <Search size={16} />
            <input className="form-input" placeholder="Search order number..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 36, width: '100%' }} id="order-search" />
          </div>
          <select className="form-select" value={activeStatus} onChange={(e) => setActiveStatus(e.target.value)} style={{ width: 180 }} id="order-filter-status">
            <option value="">All Statuses</option>
            {Object.values(ORDER_STATUS).map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Orders ({filteredOrders.length})</h3>
        </div>
        <div className="table-wrapper">
          {filteredOrders.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><ShoppingCart size={28} /></div>
              <h3>No orders found</h3>
              {can.manageOrders && role !== 'staff' && <p>Click "Create Order" to get started</p>}
            </div>
          ) : (
            <table className="table" id="orders-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Type</th>
                  <th>Supplier/Warehouse</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Created</th>
                  {can.manageOrders && role !== 'staff' && <th>Actions</th>}
                  <th>View</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{o.orderNumber}</td>
                    <td>
                      <span className={`badge ${o.type === 'purchase' ? 'status-confirmed' : 'status-dispatched'}`}>
                        {o.type === 'purchase' ? '📥 Purchase' : '📤 Sales'}
                      </span>
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {o.type === 'purchase' ? getSupplierName(o.supplierId) : getWarehouseName(o.warehouseId)}
                    </td>
                    <td style={{ fontWeight: 700 }}>{formatCurrency(o.totalAmount)}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td style={{ fontSize: 12, color: '#64748b' }}>{formatDateTime(o.createdAt)}</td>
                    {can.manageOrders && role !== 'staff' && (
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {STATUS_FLOW[o.status] && (
                            <button className="btn btn-primary btn-sm" onClick={() => handleAdvanceStatus(o)} id={`advance-order-${o.id}`}>
                              <ArrowRight size={13} /> {STATUS_LABELS[STATUS_FLOW[o.status]] || STATUS_FLOW[o.status]}
                            </button>
                          )}
                          {[ORDER_STATUS.PENDING, ORDER_STATUS.APPROVED].includes(o.status) && (
                            <button className="btn btn-danger btn-sm" onClick={() => setCancelOrderItem(o)} id={`cancel-order-${o.id}`}>
                              <XCircle size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                    <td>
                      <button className="btn btn-ghost btn-icon-only" onClick={() => openViewOrder(o)} id={`view-order-${o.id}`}>
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Order Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Create New Order" size="modal-xl"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreateOrder} disabled={submitting} id="btn-submit-order">
              {submitting ? <span className="spinner" style={{ width: 16, height: 16 }} /> : null}
              Create Order
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateOrder}>
          <div className="form-grid-3" style={{ marginBottom: 16 }}>
            <div className="form-group">
              <label className="form-label">Order Type</label>
              <select className="form-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} id="order-type">
                <option value={ORDER_TYPES.PURCHASE}>📥 Purchase Order</option>
                <option value={ORDER_TYPES.SALES}>📤 Sales Order</option>
              </select>
            </div>
            {form.type === ORDER_TYPES.PURCHASE ? (
              <div className="form-group">
                <label className="form-label">Supplier</label>
                <select className="form-select" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} id="order-supplier">
                  <option value="">Select supplier</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Warehouse (Ship From)</label>
                <select className="form-select" value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })} id="order-warehouse">
                  <option value="">Select warehouse</option>
                  {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Expected Date</label>
              <input type="date" className="form-input" value={form.expectedDate} onChange={(e) => setForm({ ...form, expectedDate: e.target.value })} id="order-expected-date" />
            </div>
          </div>

          {/* Order Items */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <label className="form-label" style={{ margin: 0 }}>Order Items</label>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addOrderItem}>
                <Plus size={14} /> Add Item
              </button>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Unit Price (₹)</th>
                    <th>Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <select className="form-select" value={item.productId} onChange={(e) => updateOrderItem(idx, 'productId', e.target.value)} id={`order-item-product-${idx}`}>
                          <option value="">Select product</option>
                          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </td>
                      <td style={{ width: 100 }}>
                        <input type="number" className="form-input" value={item.quantity} onChange={(e) => updateOrderItem(idx, 'quantity', parseInt(e.target.value) || 0)} min="1" id={`order-item-qty-${idx}`} />
                      </td>
                      <td style={{ width: 130 }}>
                        <input type="number" className="form-input" value={item.unitPrice} onChange={(e) => updateOrderItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)} min="0" step="0.01" id={`order-item-price-${idx}`} />
                      </td>
                      <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </td>
                      <td>
                        {orderItems.length > 1 && (
                          <button type="button" className="btn btn-ghost btn-icon-only" style={{ color: '#ef4444' }} onClick={() => removeOrderItem(idx)}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, padding: '12px 16px', background: '#f0f9ff', borderRadius: 8, border: '1px solid #bae6fd' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0369a1' }}>
                Total: {formatCurrency(orderTotal)}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Order notes..." id="order-notes" />
          </div>
        </form>
      </Modal>

      {/* View Order Modal */}
      <Modal isOpen={!!viewOrder} onClose={() => setViewOrder(null)} title={`Order: ${viewOrder?.orderNumber}`} size="modal-lg">
        {viewOrder && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <div className="form-label">Type</div>
                <StatusBadge status={viewOrder.type} />
              </div>
              <div>
                <div className="form-label">Status</div>
                <StatusBadge status={viewOrder.status} />
              </div>
              <div>
                <div className="form-label">Total Amount</div>
                <div style={{ fontWeight: 800, fontSize: 18, color: '#0f172a' }}>{formatCurrency(viewOrder.totalAmount)}</div>
              </div>
              <div>
                <div className="form-label">{viewOrder.type === 'purchase' ? 'Supplier' : 'Warehouse'}</div>
                <div style={{ fontWeight: 600 }}>
                  {viewOrder.type === 'purchase' ? getSupplierName(viewOrder.supplierId) : getWarehouseName(viewOrder.warehouseId)}
                </div>
              </div>
              <div>
                <div className="form-label">Created</div>
                <div style={{ fontSize: 13 }}>{formatDateTime(viewOrder.createdAt)}</div>
              </div>
              {viewOrder.expectedDate && (
                <div>
                  <div className="form-label">Expected Date</div>
                  <div style={{ fontSize: 13 }}>{viewOrder.expectedDate}</div>
                </div>
              )}
            </div>

            {viewOrder.notes && (
              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 13, color: '#475569' }}>
                📝 {viewOrder.notes}
              </div>
            )}

            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 12 }}>Order Items</h4>
            {loadingItems ? (
              <div style={{ textAlign: 'center', padding: 24 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Qty</th>
                      <th>Unit Price</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewOrderItems.map((item) => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 600 }}>{getProductName(item.productId)}</td>
                        <td>{item.quantity}</td>
                        <td>{formatCurrency(item.unitPrice)}</td>
                        <td style={{ fontWeight: 700 }}>{formatCurrency(item.quantity * item.unitPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {can.manageOrders && STATUS_FLOW[viewOrder.status] && (
              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={() => handleAdvanceStatus(viewOrder)} id={`advance-order-detail-${viewOrder.id}`}>
                  <ArrowRight size={16} /> {STATUS_LABELS[STATUS_FLOW[viewOrder.status]] || STATUS_FLOW[viewOrder.status]}
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={!!cancelOrderItem} onClose={() => setCancelOrderItem(null)} onConfirm={handleCancel} title="Cancel Order" message={`Cancel order "${cancelOrderItem?.orderNumber}"? This cannot be undone.`} confirmLabel="Cancel Order" loading={false} />
    </div>
  );
};

export default OrdersPage;
