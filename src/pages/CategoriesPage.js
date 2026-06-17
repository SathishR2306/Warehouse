// src/pages/CategoriesPage.js
import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Tag } from 'lucide-react';
import useWarehouseCollection from '../hooks/useWarehouseCollection';
import { orderBy } from '../services/firestore.service';
import { createCategory, updateCategory, deleteCategory } from '../services/product.service';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { formatDate } from '../utils/helpers';
import usePermissions from '../hooks/usePermissions';
import toast from 'react-hot-toast';

const CategoriesPage = () => {
  const { can } = usePermissions();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', color: '#6366f1' });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: categories, loading } = useWarehouseCollection('categories', [orderBy('name', 'asc')]);
  const { data: products } = useWarehouseCollection('products');

  const openAdd = () => { setForm({ name: '', description: '', color: '#6366f1' }); setEditItem(null); setShowForm(true); };
  const openEdit = (c) => { setForm({ name: c.name || '', description: c.description || '', color: c.color || '#6366f1' }); setEditItem(c); setShowForm(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Category name is required'); return; }
    setSubmitting(true);
    try {
      if (editItem) {
        await updateCategory(editItem.id, form);
        toast.success('Category updated!');
      } else {
        await createCategory(form);
        toast.success('Category created!');
      }
      setShowForm(false);
    } catch (err) {
      toast.error('Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteCategory(deleteItem.id);
      toast.success('Category deleted');
      setDeleteItem(null);
    } catch (err) {
      toast.error('Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const getProductCount = (catId) => products.filter((p) => p.categoryId === catId && p.isActive).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        {can.manageProducts && (
          <button className="btn btn-primary" onClick={openAdd} id="btn-add-category">
            <Plus size={16} /> Add Category
          </button>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Product Categories ({categories.length})</h3>
        </div>
        <div className="table-wrapper">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : categories.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Tag size={28} /></div>
              <h3>No categories yet</h3>
              <p>Add categories to organize your products</p>
            </div>
          ) : (
            <table className="table" id="categories-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Products</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: c.color || '#6366f1', flexShrink: 0 }} />
                        <span style={{ fontWeight: 600 }}>{c.name}</span>
                      </div>
                    </td>
                    <td style={{ color: '#64748b', fontSize: 13 }}>{c.description || '—'}</td>
                    <td>
                      <span className="badge" style={{ background: '#e0e7ff', color: '#4338ca' }}>
                        {getProductCount(c.id)} products
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: '#64748b' }}>{formatDate(c.createdAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {can.manageProducts && (
                          <>
                            <button className="btn btn-ghost btn-icon-only" onClick={() => openEdit(c)} title="Edit" id={`edit-cat-${c.id}`}><Edit2 size={15} /></button>
                            <button className="btn btn-ghost btn-icon-only" style={{ color: '#ef4444' }} onClick={() => setDeleteItem(c)} title="Delete" id={`delete-cat-${c.id}`}><Trash2 size={15} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editItem ? 'Edit Category' : 'Add Category'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting} id="btn-save-category">
              {submitting ? <span className="spinner" style={{ width: 16, height: 16 }} /> : null}
              {editItem ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Name <span className="required">*</span></label>
            <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Electronics" id="category-name" />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description..." id="category-desc" />
          </div>
          <div className="form-group">
            <label className="form-label">Color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} style={{ width: 48, height: 38, border: '1.5px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', padding: 2 }} id="category-color" />
              <span style={{ fontSize: 13, color: '#64748b' }}>{form.color}</span>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title="Delete Category"
        message={`Delete "${deleteItem?.name}"? Products in this category will lose their category.`}
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  );
};

export default CategoriesPage;
