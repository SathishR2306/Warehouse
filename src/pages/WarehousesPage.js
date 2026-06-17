/* eslint-disable no-unused-vars */
// src/pages/WarehousesPage.js
import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Building2, Grid, ChevronDown, ChevronRight, MapPin } from 'lucide-react';
import useWarehouseCollection from '../hooks/useWarehouseCollection';
import { where, orderBy } from '../services/firestore.service';
import { createWarehouse, updateWarehouse, deleteWarehouse, createShelf, updateShelf, deleteShelf } from '../services/warehouse.service';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { formatDate } from '../utils/helpers';
import usePermissions from '../hooks/usePermissions';
import toast from 'react-hot-toast';

const WarehousesPage = () => {
  const { can } = usePermissions();
  const [expandedWH, setExpandedWH] = useState({});
  const [showWHForm, setShowWHForm] = useState(false);
  const [showShelfForm, setShowShelfForm] = useState(false);
  const [editWH, setEditWH] = useState(null);
  const [editShelf, setEditShelf] = useState(null);
  const [deleteWH, setDeleteWH] = useState(null);
  const [deleteShelfItem, setDeleteShelfItem] = useState(null);
  const [activeWHForShelf, setActiveWHForShelf] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [whForm, setWhForm] = useState({ name: '', location: '', address: '', capacity: '', manager: '' });
  const [shelfForm, setShelfForm] = useState({ name: '', row: '', column: '', capacity: '' });

  const { data: warehouses } = useWarehouseCollection('warehouses', [where('isActive', '==', true)]);
  const { data: shelves } = useWarehouseCollection('shelves', [where('isActive', '==', true)]);
  const { data: inventory } = useWarehouseCollection('inventory');

  const getShelvesForWH = (whId) => shelves.filter((s) => s.warehouseId === whId);
  const getInventoryForWH = (whId) => inventory.filter((i) => i.warehouseId === whId);
  const getTotalStockForWH = (whId) => inventory.filter((i) => i.warehouseId === whId).reduce((sum, i) => sum + (i.quantity || 0), 0);

  const openAddWH = () => { setWhForm({ name: '', location: '', address: '', capacity: '', manager: '' }); setEditWH(null); setShowWHForm(true); };
  const openEditWH = (wh) => { setWhForm({ name: wh.name || '', location: wh.location || '', address: wh.address || '', capacity: wh.capacity || '', manager: wh.manager || '' }); setEditWH(wh); setShowWHForm(true); };

  const openAddShelf = (whId) => { setShelfForm({ name: '', row: '', column: '', capacity: '' }); setEditShelf(null); setActiveWHForShelf(whId); setShowShelfForm(true); };
  const openEditShelf = (shelf) => { setShelfForm({ name: shelf.name || '', row: shelf.row || '', column: shelf.column || '', capacity: shelf.capacity || '' }); setEditShelf(shelf); setActiveWHForShelf(shelf.warehouseId); setShowShelfForm(true); };

  const handleSaveWH = async (e) => {
    e.preventDefault();
    if (!whForm.name.trim()) { toast.error('Warehouse name is required'); return; }
    setSubmitting(true);
    try {
      const data = { ...whForm, capacity: parseInt(whForm.capacity) || 0 };
      if (editWH) { await updateWarehouse(editWH.id, data); toast.success('Warehouse updated!'); }
      else { await createWarehouse(data); toast.success('Warehouse created!'); }
      setShowWHForm(false);
    } catch (err) { toast.error('Failed to save'); }
    finally { setSubmitting(false); }
  };

  const handleSaveShelf = async (e) => {
    e.preventDefault();
    if (!shelfForm.name.trim()) { toast.error('Shelf name is required'); return; }
    setSubmitting(true);
    try {
      const data = { ...shelfForm, warehouseId: activeWHForShelf, capacity: parseInt(shelfForm.capacity) || 0 };
      if (editShelf) { await updateShelf(editShelf.id, data); toast.success('Shelf updated!'); }
      else { await createShelf(data); toast.success('Shelf added!'); }
      setShowShelfForm(false);
    } catch (err) { toast.error('Failed to save shelf'); }
    finally { setSubmitting(false); }
  };

  const handleDeleteWH = async () => {
    setDeleting(true);
    try { await deleteWarehouse(deleteWH.id); toast.success('Warehouse deleted'); setDeleteWH(null); }
    catch (err) { toast.error('Failed to delete'); }
    finally { setDeleting(false); }
  };

  const handleDeleteShelf = async () => {
    setDeleting(true);
    try { await deleteShelf(deleteShelfItem.id); toast.success('Shelf deleted'); setDeleteShelfItem(null); }
    catch (err) { toast.error('Failed to delete'); }
    finally { setDeleting(false); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        {can.manageWarehouses && (
          <button className="btn btn-primary" onClick={openAddWH} id="btn-add-warehouse">
            <Plus size={16} /> Add Warehouse
          </button>
        )}
      </div>

      {warehouses.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding: 60 }}>
            <div className="empty-state-icon"><Building2 size={28} /></div>
            <h3>No warehouses yet</h3>
            <p>Add your first warehouse to start managing inventory locations</p>
            {can.manageWarehouses && <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openAddWH}><Plus size={16} /> Add Warehouse</button>}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {warehouses.map((wh) => {
            const warehouseShelves = getShelvesForWH(wh.id);
            const totalStock = getTotalStockForWH(wh.id);
            const utilization = wh.capacity ? Math.min((totalStock / wh.capacity) * 100, 100) : 0;
            const isExpanded = expandedWH[wh.id];

            return (
              <div key={wh.id} className="card">
                {/* Warehouse Header */}
                <div
                  style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}
                  onClick={() => setExpandedWH({ ...expandedWH, [wh.id]: !isExpanded })}
                >
                  <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Building2 size={22} color="white" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{wh.name}</h3>
                      <span className="badge status-active">Active</span>
                    </div>
                    {wh.location && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        <MapPin size={12} /> {wh.location}
                      </div>
                    )}
                    {wh.capacity > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                          <span>Utilization: {totalStock} / {wh.capacity} units</span>
                          <span>{Math.round(utilization)}%</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-bar-fill" style={{ width: `${utilization}%`, background: utilization > 80 ? '#ef4444' : utilization > 60 ? '#f59e0b' : '#10b981' }} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>{warehouseShelves.length}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>Shelves</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>{totalStock}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>Stock Units</div>
                    </div>
                    {can.manageWarehouses && (
                      <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                        <button className="btn btn-ghost btn-icon-only" onClick={() => openEditWH(wh)} title="Edit" id={`edit-wh-${wh.id}`}><Edit2 size={15} /></button>
                        <button className="btn btn-ghost btn-icon-only" style={{ color: '#ef4444' }} onClick={() => setDeleteWH(wh)} title="Delete" id={`delete-wh-${wh.id}`}><Trash2 size={15} /></button>
                      </div>
                    )}
                    {isExpanded ? <ChevronDown size={18} color="#64748b" /> : <ChevronRight size={18} color="#64748b" />}
                  </div>
                </div>

                {/* Shelves Section */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid #f1f5f9', padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>
                        <Grid size={14} style={{ display: 'inline', marginRight: 6 }} />
                        Shelves & Bins
                      </h4>
                      {can.manageWarehouses && (
                        <button className="btn btn-secondary btn-sm" onClick={() => openAddShelf(wh.id)} id={`btn-add-shelf-${wh.id}`}>
                          <Plus size={14} /> Add Shelf
                        </button>
                      )}
                    </div>
                    {warehouseShelves.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: 13 }}>
                        No shelves added yet
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                        {warehouseShelves.map((shelf) => {
                          const shelfStock = inventory.filter((i) => i.warehouseId === wh.id && i.shelfId === shelf.id).reduce((sum, i) => sum + (i.quantity || 0), 0);
                          return (
                            <div key={shelf.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{shelf.name}</div>
                                {can.manageWarehouses && (
                                  <div style={{ display: 'flex', gap: 2 }}>
                                    <button className="btn btn-ghost btn-icon-only" style={{ padding: 4 }} onClick={() => openEditShelf(shelf)} id={`edit-shelf-${shelf.id}`}><Edit2 size={13} /></button>
                                    <button className="btn btn-ghost btn-icon-only" style={{ padding: 4, color: '#ef4444' }} onClick={() => setDeleteShelfItem(shelf)} id={`delete-shelf-${shelf.id}`}><Trash2 size={13} /></button>
                                  </div>
                                )}
                              </div>
                              {shelf.row && <div style={{ fontSize: 11, color: '#64748b' }}>Row {shelf.row}{shelf.column ? `, Col ${shelf.column}` : ''}</div>}
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>{shelfStock} units</div>
                              {shelf.capacity > 0 && (
                                <div style={{ marginTop: 6 }}>
                                  <div className="progress-bar" style={{ height: 4 }}>
                                    <div className="progress-bar-fill" style={{ width: `${Math.min((shelfStock / shelf.capacity) * 100, 100)}%`, background: '#6366f1' }} />
                                  </div>
                                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{shelfStock}/{shelf.capacity} cap.</div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Warehouse Form */}
      <Modal isOpen={showWHForm} onClose={() => setShowWHForm(false)} title={editWH ? 'Edit Warehouse' : 'Add Warehouse'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowWHForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSaveWH} disabled={submitting} id="btn-save-warehouse">
              {submitting ? <span className="spinner" style={{ width: 16, height: 16 }} /> : null}
              {editWH ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveWH}>
          <div className="form-group">
            <label className="form-label">Warehouse Name <span className="required">*</span></label>
            <input className="form-input" value={whForm.name} onChange={(e) => setWhForm({ ...whForm, name: e.target.value })} required placeholder="e.g. Mumbai Central Warehouse" id="wh-name" />
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Location</label>
              <input className="form-input" value={whForm.location} onChange={(e) => setWhForm({ ...whForm, location: e.target.value })} placeholder="e.g. Mumbai, Maharashtra" id="wh-location" />
            </div>
            <div className="form-group">
              <label className="form-label">Capacity (units)</label>
              <input type="number" className="form-input" value={whForm.capacity} onChange={(e) => setWhForm({ ...whForm, capacity: e.target.value })} min="0" placeholder="Max units" id="wh-capacity" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Full Address</label>
            <textarea className="form-textarea" value={whForm.address} onChange={(e) => setWhForm({ ...whForm, address: e.target.value })} placeholder="Full warehouse address..." id="wh-address" />
          </div>
          <div className="form-group">
            <label className="form-label">Manager Name</label>
            <input className="form-input" value={whForm.manager} onChange={(e) => setWhForm({ ...whForm, manager: e.target.value })} placeholder="Warehouse manager" id="wh-manager" />
          </div>
        </form>
      </Modal>

      {/* Shelf Form */}
      <Modal isOpen={showShelfForm} onClose={() => setShowShelfForm(false)} title={editShelf ? 'Edit Shelf' : 'Add Shelf'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowShelfForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSaveShelf} disabled={submitting} id="btn-save-shelf">
              {submitting ? <span className="spinner" style={{ width: 16, height: 16 }} /> : null}
              {editShelf ? 'Update' : 'Add Shelf'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveShelf}>
          <div className="form-group">
            <label className="form-label">Shelf Name <span className="required">*</span></label>
            <input className="form-input" value={shelfForm.name} onChange={(e) => setShelfForm({ ...shelfForm, name: e.target.value })} required placeholder="e.g. Shelf A1" id="shelf-name" />
          </div>
          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">Row</label>
              <input className="form-input" value={shelfForm.row} onChange={(e) => setShelfForm({ ...shelfForm, row: e.target.value })} placeholder="e.g. A" id="shelf-row" />
            </div>
            <div className="form-group">
              <label className="form-label">Column</label>
              <input className="form-input" value={shelfForm.column} onChange={(e) => setShelfForm({ ...shelfForm, column: e.target.value })} placeholder="e.g. 1" id="shelf-col" />
            </div>
            <div className="form-group">
              <label className="form-label">Capacity</label>
              <input type="number" className="form-input" value={shelfForm.capacity} onChange={(e) => setShelfForm({ ...shelfForm, capacity: e.target.value })} min="0" placeholder="Max units" id="shelf-capacity" />
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteWH} onClose={() => setDeleteWH(null)} onConfirm={handleDeleteWH} title="Delete Warehouse" message={`Delete "${deleteWH?.name}"? All shelf and inventory data will be affected.`} confirmLabel="Delete" loading={deleting} />
      <ConfirmDialog isOpen={!!deleteShelfItem} onClose={() => setDeleteShelfItem(null)} onConfirm={handleDeleteShelf} title="Delete Shelf" message={`Delete "${deleteShelfItem?.name}"?`} confirmLabel="Delete" loading={deleting} />
    </div>
  );
};

export default WarehousesPage;
