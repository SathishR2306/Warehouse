/* eslint-disable no-unused-vars */
// src/pages/SuppliersPage.js
import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Users, Phone, Mail, Globe, MapPin } from 'lucide-react';
import useWarehouseCollection from '../hooks/useWarehouseCollection';
import { where, orderBy } from '../services/firestore.service';
import { createSupplier, updateSupplier, deleteSupplier } from '../services/supplier.service';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { formatDate, getInitials } from '../utils/helpers';
import { PAYMENT_TERMS } from '../constants';
import usePermissions from '../hooks/usePermissions';
import toast from 'react-hot-toast';

const EMPTY_FORM = {
  name: '', contactName: '', email: '', phone: '', website: '',
  address: '', city: '', country: 'India', paymentTerms: 'Net 30',
  rating: 5, notes: '',
};

const SuppliersPage = () => {
  const { can } = usePermissions();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: suppliers, loading } = useWarehouseCollection('suppliers', [where('isActive', '==', true), orderBy('name', 'asc')]);
  const { data: products } = useWarehouseCollection('products', [where('isActive', '==', true)]);

  const filtered = suppliers.filter((s) =>
    !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setForm(EMPTY_FORM); setEditItem(null); setShowForm(true); };
  const openEdit = (s) => { setForm({ ...EMPTY_FORM, ...s }); setEditItem(s); setShowForm(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Supplier name is required'); return; }
    setSubmitting(true);
    try {
      if (editItem) { await updateSupplier(editItem.id, form); toast.success('Supplier updated!'); }
      else { await createSupplier(form); toast.success('Supplier added!'); }
      setShowForm(false);
    } catch (err) { toast.error('Failed to save supplier'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await deleteSupplier(deleteItem.id); toast.success('Supplier removed'); setDeleteItem(null); }
    catch (err) { toast.error('Failed to delete'); }
    finally { setDeleting(false); }
  };

  const getProductCount = (supId) => products.filter((p) => p.supplierId === supId).length;

  const renderStars = (rating) => '★'.repeat(rating) + '☆'.repeat(5 - rating);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <input className="form-input" placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 16, width: '100%' }} id="supplier-search" />
        </div>
        {can.manageSuppliers && (
          <button className="btn btn-primary" onClick={openAdd} id="btn-add-supplier">
            <Plus size={16} /> Add Supplier
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding: 60 }}>
            <div className="empty-state-icon"><Users size={28} /></div>
            <h3>No suppliers yet</h3>
            <p>Add suppliers to track your vendor relationships</p>
            {can.manageSuppliers && <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openAdd}><Plus size={16} /> Add Supplier</button>}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filtered.map((s) => (
            <div key={s.id} className="card" style={{ transition: 'transform 0.2s, box-shadow 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
            >
              <div style={{ padding: '20px 20px 0' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
                  <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
                    {getInitials(s.name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{s.name}</div>
                    {s.contactName && <div style={{ fontSize: 12, color: '#64748b' }}>Contact: {s.contactName}</div>}
                    <div style={{ color: '#f59e0b', fontSize: 13, marginTop: 2 }}>{renderStars(s.rating || 0)}</div>
                  </div>
                  {can.manageSuppliers && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-icon-only" onClick={() => openEdit(s)} id={`edit-sup-${s.id}`}><Edit2 size={14} /></button>
                      <button className="btn btn-ghost btn-icon-only" style={{ color: '#ef4444' }} onClick={() => setDeleteItem(s)} id={`delete-sup-${s.id}`}><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                  {s.email && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569' }}><Mail size={13} color="#94a3b8" />{s.email}</div>}
                  {s.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569' }}><Phone size={13} color="#94a3b8" />{s.phone}</div>}
                  {s.city && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569' }}><MapPin size={13} color="#94a3b8" />{s.city}{s.country ? `, ${s.country}` : ''}</div>}
                  {s.website && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6366f1' }}><Globe size={13} />{s.website}</div>}
                </div>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', padding: '12px 20px', display: 'flex', gap: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{getProductCount(s.id)}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Products</div>
                </div>
                <div style={{ width: 1, background: '#f1f5f9' }} />
                <div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Payment Terms</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{s.paymentTerms || 'Net 30'}</div>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <span className="badge status-active">Active</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Supplier Form */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editItem ? 'Edit Supplier' : 'Add Supplier'} size="modal-lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting} id="btn-save-supplier">
              {submitting ? <span className="spinner" style={{ width: 16, height: 16 }} /> : null}
              {editItem ? 'Update' : 'Add Supplier'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Company Name <span className="required">*</span></label>
              <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Fresh Farm Co." id="supplier-name" />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Person</label>
              <input className="form-input" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} placeholder="Primary contact name" id="supplier-contact" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="supplier@company.com" id="supplier-email" />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 XXXXX XXXXX" id="supplier-phone" />
            </div>
            <div className="form-group">
              <label className="form-label">Website</label>
              <input className="form-input" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://supplier.com" id="supplier-website" />
            </div>
            <div className="form-group">
              <label className="form-label">Payment Terms</label>
              <select className="form-select" value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} id="supplier-payment">
                {PAYMENT_TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">City</label>
              <input className="form-input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Mumbai" id="supplier-city" />
            </div>
            <div className="form-group">
              <label className="form-label">Rating (1-5)</label>
              <input type="number" className="form-input" value={form.rating} onChange={(e) => setForm({ ...form, rating: parseInt(e.target.value) || 5 })} min="1" max="5" id="supplier-rating" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Address</label>
            <textarea className="form-textarea" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Full address..." id="supplier-address" />
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." id="supplier-notes" />
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} onConfirm={handleDelete} title="Remove Supplier" message={`Remove "${deleteItem?.name}" from your supplier list?`} confirmLabel="Remove" loading={deleting} />
    </div>
  );
};

export default SuppliersPage;
