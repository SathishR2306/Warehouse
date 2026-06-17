/* eslint-disable no-unused-vars */
// src/pages/InventoryPage.js
import React, { useState } from 'react';
import { Plus, Search, ArrowUpCircle, ArrowDownCircle, RefreshCw, History, Layers, Filter } from 'lucide-react';
import useWarehouseCollection from '../hooks/useWarehouseCollection';
import { where, orderBy, limit } from '../services/firestore.service';
import { stockIn, stockOut, adjustInventory, getTransactionHistory } from '../services/inventory.service';
import Modal from '../components/common/Modal';
import { StatusBadge } from '../components/common/Badge';
import { formatCurrency, formatDateTime, timeAgo } from '../utils/helpers';
import { TRANSACTION_TYPES, LOW_STOCK_THRESHOLD } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import usePermissions from '../hooks/usePermissions';
import toast from 'react-hot-toast';

const InventoryPage = () => {
  const { userProfile, role } = useAuth();
  const { can } = usePermissions();
  const [activeTab, setActiveTab] = useState('stock');
  const [search, setSearch] = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [showStockIn, setShowStockIn] = useState(false);
  const [showStockOut, setShowStockOut] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [selectedInv, setSelectedInv] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [stockInForm, setStockInForm] = useState({ productId: '', warehouseId: '', shelfId: '', quantity: '', costPrice: '', batchNumber: '', expiryDate: '', notes: '' });
  const [stockOutForm, setStockOutForm] = useState({ productId: '', warehouseId: '', shelfId: '', quantity: '', notes: '' });
  const [adjustForm, setAdjustForm] = useState({ productId: '', warehouseId: '', shelfId: '', newQuantity: '', reason: '' });

  const { data: inventory } = useWarehouseCollection('inventory');
  const { data: products } = useWarehouseCollection('products', [where('isActive', '==', true)]);
  const { data: warehouses } = useWarehouseCollection('warehouses', [where('isActive', '==', true)]);
  const { data: shelves } = useWarehouseCollection('shelves', [where('isActive', '==', true)]);
  const { data: transactions } = useWarehouseCollection('inventory_transactions', [orderBy('createdAt', 'desc'), limit(100)]);

  const getProduct = (id) => products.find((p) => p.id === id);
  const getWarehouse = (id) => warehouses.find((w) => w.id === id);
  const getShelf = (id) => shelves.find((s) => s.id === id);
  const getShelvesForWarehouse = (wId) => shelves.filter((s) => s.warehouseId === wId);

  const filteredInventory = inventory.filter((inv) => {
    const product = getProduct(inv.productId);
    const matchSearch = !search || product?.name?.toLowerCase().includes(search.toLowerCase());
    const matchWarehouse = !filterWarehouse || inv.warehouseId === filterWarehouse;
    return matchSearch && matchWarehouse;
  });

  const handleStockIn = async (e) => {
    e.preventDefault();
    if (!stockInForm.productId || !stockInForm.warehouseId || !stockInForm.quantity) {
      toast.error('Product, warehouse and quantity are required');
      return;
    }
    setSubmitting(true);
    try {
      await stockIn({
        ...stockInForm,
        quantity: parseInt(stockInForm.quantity),
        costPrice: parseFloat(stockInForm.costPrice) || 0,
        performedBy: userProfile?.uid,
        shelfId: stockInForm.shelfId || 'default',
      });
      toast.success(`Stock added successfully!`);
      setShowStockIn(false);
      setStockInForm({ productId: '', warehouseId: '', shelfId: '', quantity: '', costPrice: '', batchNumber: '', expiryDate: '', notes: '' });
    } catch (err) {
      toast.error(err.message || 'Failed to add stock');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStockOut = async (e) => {
    e.preventDefault();
    if (!stockOutForm.productId || !stockOutForm.warehouseId || !stockOutForm.quantity) {
      toast.error('Product, warehouse and quantity are required');
      return;
    }
    setSubmitting(true);
    try {
      await stockOut({
        ...stockOutForm,
        quantity: parseInt(stockOutForm.quantity),
        performedBy: userProfile?.uid,
        shelfId: stockOutForm.shelfId || 'default',
      });
      toast.success('Stock out recorded!');
      setShowStockOut(false);
      setStockOutForm({ productId: '', warehouseId: '', shelfId: '', quantity: '', notes: '' });
    } catch (err) {
      toast.error(err.message || 'Failed to record stock out');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjust = async (e) => {
    e.preventDefault();
    if (!adjustForm.productId || !adjustForm.warehouseId || adjustForm.newQuantity === '') {
      toast.error('Product, warehouse and new quantity are required');
      return;
    }
    setSubmitting(true);
    try {
      await adjustInventory({
        ...adjustForm,
        newQuantity: parseInt(adjustForm.newQuantity),
        performedBy: userProfile?.uid,
        shelfId: adjustForm.shelfId || 'default',
      });
      toast.success('Inventory adjusted!');
      setShowAdjust(false);
      setAdjustForm({ productId: '', warehouseId: '', shelfId: '', newQuantity: '', reason: '' });
    } catch (err) {
      toast.error(err.message || 'Failed to adjust inventory');
    } finally {
      setSubmitting(false);
    }
  };

  const getStockClass = (qty, reorderPoint) => {
    if (qty === 0) return 'stock-critical';
    if (qty <= (reorderPoint || LOW_STOCK_THRESHOLD)) return 'stock-low';
    return 'stock-ok';
  };

  return (
    <div>
      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {role !== 'staff' && (
          <>
            <button className="btn btn-success" onClick={() => setShowStockIn(true)} id="btn-stock-in">
              <ArrowUpCircle size={16} /> Stock In
            </button>
            <button className="btn btn-danger" onClick={() => setShowStockOut(true)} id="btn-stock-out">
              <ArrowDownCircle size={16} /> Stock Out
            </button>
          </>
        )}
        {can.adjustInventory && role !== 'staff' && (
          <button className="btn btn-secondary" onClick={() => setShowAdjust(true)} id="btn-adjust">
            <RefreshCw size={16} /> Adjust
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button className={`btn ${activeTab === 'stock' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('stock')}>
          <Layers size={16} /> Stock Levels
        </button>
        <button className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('history')}>
          <History size={16} /> Transaction History
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ padding: '14px 20px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ flex: 1 }}>
            <Search size={16} />
            <input className="form-input" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 36, width: '100%' }} id="inventory-search" />
          </div>
          <select className="form-select" value={filterWarehouse} onChange={(e) => setFilterWarehouse(e.target.value)} style={{ width: 200 }} id="inventory-filter-warehouse">
            <option value="">All Warehouses</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
      </div>

      {/* Stock Levels */}
      {activeTab === 'stock' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Current Stock Levels ({filteredInventory.length})</h3>
            <div style={{ display: 'flex', gap: 12 }}>
              <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>● Critical (0)</span>
              <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>● Low Stock</span>
              <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>● Good</span>
            </div>
          </div>
          <div className="table-wrapper">
            {filteredInventory.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><Layers size={28} /></div>
                <h3>No inventory records</h3>
                <p>Use Stock In to add products to inventory</p>
              </div>
            ) : (
              <table className="table" id="inventory-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Warehouse</th>
                    <th>Shelf</th>
                    <th>Qty</th>
                    <th>Reserved</th>
                    <th>Available</th>
                    <th>Status</th>
                    <th>Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((inv) => {
                    const product = getProduct(inv.productId);
                    const warehouse = getWarehouse(inv.warehouseId);
                    const shelf = getShelf(inv.shelfId);
                    const available = (inv.quantity || 0) - (inv.reservedQuantity || 0);
                    return (
                      <tr key={inv.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {product?.imageBase64 ? (
                              <img src={product.imageBase64} alt="" className="product-image" style={{ width: 34, height: 34 }} />
                            ) : null}
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{product?.name || '—'}</div>
                              <div style={{ fontSize: 11, color: '#94a3b8' }}>{product?.sku}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: 13 }}>{warehouse?.name || '—'}</td>
                        <td style={{ fontSize: 13, color: '#64748b' }}>{shelf?.name || inv.shelfId || '—'}</td>
                        <td>
                          <span className={getStockClass(inv.quantity, product?.reorderPoint)} style={{ fontSize: 15 }}>
                            {inv.quantity}
                          </span>
                        </td>
                        <td style={{ color: '#64748b' }}>{inv.reservedQuantity || 0}</td>
                        <td style={{ fontWeight: 600 }}>{available}</td>
                        <td>
                          {inv.quantity === 0 ? (
                            <span className="badge status-cancelled">Out of Stock</span>
                          ) : inv.quantity <= (product?.reorderPoint || LOW_STOCK_THRESHOLD) ? (
                            <span className="badge status-low_stock">Low Stock</span>
                          ) : (
                            <span className="badge status-active">In Stock</span>
                          )}
                        </td>
                        <td style={{ fontSize: 12, color: '#64748b' }}>{timeAgo(inv.updatedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Transaction History */}
      {activeTab === 'history' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Transaction History ({transactions.length})</h3>
          </div>
          <div className="table-wrapper">
            {transactions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><History size={28} /></div>
                <h3>No transactions yet</h3>
              </div>
            ) : (
              <table className="table" id="transactions-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Product</th>
                    <th>Warehouse</th>
                    <th>Quantity</th>
                    <th>Batch</th>
                    <th>Notes</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const product = getProduct(tx.productId);
                    const warehouse = getWarehouse(tx.warehouseId);
                    return (
                      <tr key={tx.id}>
                        <td><StatusBadge status={tx.type} /></td>
                        <td style={{ fontWeight: 600, fontSize: 13 }}>{product?.name || '—'}</td>
                        <td style={{ fontSize: 13 }}>{warehouse?.name || '—'}</td>
                        <td>
                          <span style={{ fontWeight: 700, color: tx.quantity > 0 ? '#10b981' : '#ef4444', fontSize: 14 }}>
                            {tx.quantity > 0 ? '+' : ''}{tx.quantity}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>{tx.batchNumber || '—'}</td>
                        <td style={{ fontSize: 12, color: '#64748b', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.notes || '—'}</td>
                        <td style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{formatDateTime(tx.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Stock In Modal */}
      <Modal isOpen={showStockIn} onClose={() => setShowStockIn(false)} title="📦 Stock In"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowStockIn(false)}>Cancel</button>
            <button className="btn btn-success" onClick={handleStockIn} disabled={submitting} id="btn-submit-stock-in">
              {submitting ? <span className="spinner" style={{ width: 16, height: 16 }} /> : null}
              Add Stock
            </button>
          </>
        }
      >
        <form onSubmit={handleStockIn}>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Product <span className="required">*</span></label>
              <select className="form-select" value={stockInForm.productId} onChange={(e) => setStockInForm({ ...stockInForm, productId: e.target.value })} required id="stock-in-product">
                <option value="">Select product</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Warehouse <span className="required">*</span></label>
              <select className="form-select" value={stockInForm.warehouseId} onChange={(e) => setStockInForm({ ...stockInForm, warehouseId: e.target.value, shelfId: '' })} required id="stock-in-warehouse">
                <option value="">Select warehouse</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Shelf/Bin</label>
              <select className="form-select" value={stockInForm.shelfId} onChange={(e) => setStockInForm({ ...stockInForm, shelfId: e.target.value })} id="stock-in-shelf">
                <option value="">Default shelf</option>
                {getShelvesForWarehouse(stockInForm.warehouseId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Quantity <span className="required">*</span></label>
              <input type="number" className="form-input" value={stockInForm.quantity} onChange={(e) => setStockInForm({ ...stockInForm, quantity: e.target.value })} min="1" required placeholder="0" id="stock-in-qty" />
            </div>
            <div className="form-group">
              <label className="form-label">Cost Price (₹)</label>
              <input type="number" className="form-input" value={stockInForm.costPrice} onChange={(e) => setStockInForm({ ...stockInForm, costPrice: e.target.value })} min="0" step="0.01" placeholder="0.00" id="stock-in-cost" />
            </div>
            <div className="form-group">
              <label className="form-label">Batch Number</label>
              <input className="form-input" value={stockInForm.batchNumber} onChange={(e) => setStockInForm({ ...stockInForm, batchNumber: e.target.value })} placeholder="e.g. BATCH-001" id="stock-in-batch" />
            </div>
            <div className="form-group">
              <label className="form-label">Expiry Date</label>
              <input type="date" className="form-input" value={stockInForm.expiryDate} onChange={(e) => setStockInForm({ ...stockInForm, expiryDate: e.target.value })} id="stock-in-expiry" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" value={stockInForm.notes} onChange={(e) => setStockInForm({ ...stockInForm, notes: e.target.value })} placeholder="Optional notes..." id="stock-in-notes" />
          </div>
        </form>
      </Modal>

      {/* Stock Out Modal */}
      <Modal isOpen={showStockOut} onClose={() => setShowStockOut(false)} title="📤 Stock Out"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowStockOut(false)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleStockOut} disabled={submitting} id="btn-submit-stock-out">
              {submitting ? <span className="spinner" style={{ width: 16, height: 16 }} /> : null}
              Record Stock Out
            </button>
          </>
        }
      >
        <form onSubmit={handleStockOut}>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Product <span className="required">*</span></label>
              <select className="form-select" value={stockOutForm.productId} onChange={(e) => setStockOutForm({ ...stockOutForm, productId: e.target.value })} required id="stock-out-product">
                <option value="">Select product</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Warehouse <span className="required">*</span></label>
              <select className="form-select" value={stockOutForm.warehouseId} onChange={(e) => setStockOutForm({ ...stockOutForm, warehouseId: e.target.value, shelfId: '' })} required id="stock-out-warehouse">
                <option value="">Select warehouse</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Shelf/Bin</label>
              <select className="form-select" value={stockOutForm.shelfId} onChange={(e) => setStockOutForm({ ...stockOutForm, shelfId: e.target.value })} id="stock-out-shelf">
                <option value="">Default shelf</option>
                {getShelvesForWarehouse(stockOutForm.warehouseId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Quantity <span className="required">*</span></label>
              <input type="number" className="form-input" value={stockOutForm.quantity} onChange={(e) => setStockOutForm({ ...stockOutForm, quantity: e.target.value })} min="1" required placeholder="0" id="stock-out-qty" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes / Reason</label>
            <textarea className="form-textarea" value={stockOutForm.notes} onChange={(e) => setStockOutForm({ ...stockOutForm, notes: e.target.value })} placeholder="Reason for stock out..." id="stock-out-notes" />
          </div>
        </form>
      </Modal>

      {/* Adjust Modal */}
      <Modal isOpen={showAdjust} onClose={() => setShowAdjust(false)} title="🔧 Adjust Inventory"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowAdjust(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAdjust} disabled={submitting} id="btn-submit-adjust">
              {submitting ? <span className="spinner" style={{ width: 16, height: 16 }} /> : null}
              Apply Adjustment
            </button>
          </>
        }
      >
        <form onSubmit={handleAdjust}>
          <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13, color: '#92400e' }}>
            ⚠️ This will override the current stock quantity. Use with caution.
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Product <span className="required">*</span></label>
              <select className="form-select" value={adjustForm.productId} onChange={(e) => setAdjustForm({ ...adjustForm, productId: e.target.value })} required id="adjust-product">
                <option value="">Select product</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Warehouse <span className="required">*</span></label>
              <select className="form-select" value={adjustForm.warehouseId} onChange={(e) => setAdjustForm({ ...adjustForm, warehouseId: e.target.value })} required id="adjust-warehouse">
                <option value="">Select warehouse</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">New Quantity <span className="required">*</span></label>
              <input type="number" className="form-input" value={adjustForm.newQuantity} onChange={(e) => setAdjustForm({ ...adjustForm, newQuantity: e.target.value })} min="0" required placeholder="Enter new stock count" id="adjust-qty" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Reason <span className="required">*</span></label>
            <textarea className="form-textarea" value={adjustForm.reason} onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })} required placeholder="Why are you adjusting? e.g. Physical count correction" id="adjust-reason" />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default InventoryPage;
