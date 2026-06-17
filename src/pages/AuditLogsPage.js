/* eslint-disable no-unused-vars */
// src/pages/AuditLogsPage.js
import React, { useState } from 'react';
import { FileText, Search } from 'lucide-react';
import useWarehouseCollection from '../hooks/useWarehouseCollection';
import { orderBy, limit, where } from '../services/firestore.service';
import { formatDateTime } from '../utils/helpers';
import { StatusBadge } from '../components/common/Badge';

const AuditLogsPage = () => {
  const [search, setSearch] = useState('');

  // In a full implementation, audit logs would be written on every CRUD action
  // For now, we use inventory_transactions as the audit trail
  const { data: transactions, loading } = useWarehouseCollection(
    'inventory_transactions',
    [orderBy('createdAt', 'desc'), limit(200)]
  );
  const { data: products } = useWarehouseCollection('products');
  const { data: warehouses } = useWarehouseCollection('warehouses');
  const { data: users } = useWarehouseCollection('users');

  const getProductName = (id) => products.find((p) => p.id === id)?.name || id;
  const getWarehouseName = (id) => warehouses.find((w) => w.id === id)?.name || id;
  const getUserName = (uid) => {
    const u = users.find((u) => u.uid === uid);
    return u?.displayName || u?.email || uid || 'System';
  };

  const filtered = transactions.filter((t) => {
    if (!search) return true;
    return (
      getProductName(t.productId)?.toLowerCase().includes(search.toLowerCase()) ||
      t.type?.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 16px', fontSize: 13, color: '#92400e', display: 'flex', alignItems: 'center', gap: 8 }}>
          🔒 Admin Only — Full audit trail of all inventory movements
        </div>
        <div className="search-bar">
          <Search size={16} />
          <input className="form-input" placeholder="Search logs..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 36, width: 250 }} id="audit-search" />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Audit Log ({filtered.length} entries)</h3>
        </div>
        <div className="table-wrapper">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><FileText size={28} /></div>
              <h3>No audit logs yet</h3>
              <p>Actions will be logged as users interact with the system</p>
            </div>
          ) : (
            <table className="table" id="audit-logs-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Action Type</th>
                  <th>Product</th>
                  <th>Warehouse</th>
                  <th>Quantity Change</th>
                  <th>Performed By</th>
                  <th>Batch</th>
                  <th>Notes</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log, idx) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{filtered.length - idx}</td>
                    <td><StatusBadge status={log.type} /></td>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{getProductName(log.productId)}</td>
                    <td style={{ fontSize: 13 }}>{getWarehouseName(log.warehouseId)}</td>
                    <td>
                      <span style={{ fontWeight: 700, fontSize: 14, color: log.quantity > 0 ? '#10b981' : '#ef4444' }}>
                        {log.quantity > 0 ? '+' : ''}{log.quantity}
                      </span>
                    </td>
                    <td style={{ fontSize: 12 }}>{getUserName(log.performedBy)}</td>
                    <td style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{log.batchNumber || '—'}</td>
                    <td style={{ fontSize: 12, color: '#64748b', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.notes || log.reason || '—'}</td>
                    <td style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{formatDateTime(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLogsPage;
