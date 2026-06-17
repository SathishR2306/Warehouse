// src/pages/ProductsPage.js
import React, { useState, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, Package, Upload, X, Eye } from 'lucide-react';
import useWarehouseCollection from '../hooks/useWarehouseCollection';
import { where, orderBy } from '../services/firestore.service';
import { createProduct, updateProduct, deleteProduct } from '../services/product.service';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { formatCurrency } from '../utils/helpers';
import { compressAndConvertToBase64, validateImageFile } from '../utils/imageUtils';
import { PRODUCT_UNITS } from '../constants';
import usePermissions from '../hooks/usePermissions';
import toast from 'react-hot-toast';

const EMPTY_FORM = {
  name: '', sku: '', description: '', categoryId: '', supplierId: '',
  unit: 'pieces', costPrice: '', sellingPrice: '', reorderPoint: 10,
  imageBase64: null, isActive: true, tags: '',
};

const ProductsPage = () => {
  const { can } = usePermissions();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef();

  const { data: products, loading } = useWarehouseCollection('products', [where('isActive', '==', true), orderBy('createdAt', 'desc')]);
  const { data: categories } = useWarehouseCollection('categories', [orderBy('name', 'asc')]);
  const { data: suppliers } = useWarehouseCollection('suppliers', [where('isActive', '==', true), orderBy('name', 'asc')]);

  const filtered = products.filter((p) => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCategory || p.categoryId === filterCategory;
    return matchSearch && matchCat;
  });

  const openAdd = () => { setForm(EMPTY_FORM); setImageFile(null); setImagePreview(null); setEditItem(null); setShowForm(true); };
  const openEdit = (p) => {
    setForm({
      name: p.name || '', sku: p.sku || '', description: p.description || '',
      categoryId: p.categoryId || '', supplierId: p.supplierId || '',
      unit: p.unit || 'pieces', costPrice: p.costPrice || '', sellingPrice: p.sellingPrice || '',
      reorderPoint: p.reorderPoint || 10, imageBase64: p.imageBase64 || null,
      isActive: p.isActive ?? true, tags: p.tags || '',
    });
    setImagePreview(p.imageBase64 || null);
    setImageFile(null);
    setEditItem(p);
    setShowForm(true);
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const validation = validateImageFile(file);
    if (!validation.valid) { toast.error(validation.error); return; }
    setImageFile(file);
    const preview = await compressAndConvertToBase64(file);
    setImagePreview(preview);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Product name is required'); return; }
    setSubmitting(true);
    try {
      const data = {
        ...form,
        costPrice: parseFloat(form.costPrice) || 0,
        sellingPrice: parseFloat(form.sellingPrice) || 0,
        reorderPoint: parseInt(form.reorderPoint) || 10,
      };
      if (imagePreview && !imageFile) data.imageBase64 = imagePreview;

      if (editItem) {
        await updateProduct(editItem.id, data, imageFile);
        toast.success('Product updated!');
      } else {
        await createProduct(data, imageFile);
        toast.success('Product added!');
      }
      setShowForm(false);
    } catch (err) {
      toast.error(err.message || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await deleteProduct(deleteItem.id);
      toast.success('Product archived');
      setDeleteItem(null);
    } catch (err) {
      toast.error('Failed to delete product');
    } finally {
      setDeleting(false);
    }
  };

  const getCategoryName = (id) => categories.find((c) => c.id === id)?.name || '—';
  const getSupplierName = (id) => suppliers.find((s) => s.id === id)?.name || '—';

  return (
    <div>
      {/* Toolbar */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
            <Search size={16} />
            <input
              className="form-input"
              placeholder="Search by name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 36, width: '100%' }}
              id="product-search"
            />
          </div>
          <select
            className="form-select"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{ width: 180 }}
            id="product-filter-category"
          >
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {can.manageProducts && (
            <button className="btn btn-primary" onClick={openAdd} id="btn-add-product">
              <Plus size={16} /> Add Product
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Products ({filtered.length})</h3>
        </div>
        <div className="table-wrapper">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Package size={28} /></div>
              <h3>No products found</h3>
              <p>{search ? 'Try a different search term' : 'Click "Add Product" to get started'}</p>
            </div>
          ) : (
            <table className="table" id="products-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Supplier</th>
                  <th>Cost Price</th>
                  <th>Sell Price</th>
                  <th>Unit</th>
                  <th>Reorder At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {p.imageBase64 ? (
                          <img src={p.imageBase64} alt={p.name} className="product-image" />
                        ) : (
                          <div className="product-image-placeholder"><Package size={18} /></div>
                        )}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                          {p.tags && <div style={{ fontSize: 11, color: '#94a3b8' }}>{p.tags}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>{p.sku || '—'}</td>
                    <td>{getCategoryName(p.categoryId)}</td>
                    <td>{getSupplierName(p.supplierId)}</td>
                    <td>{formatCurrency(p.costPrice)}</td>
                    <td>{formatCurrency(p.sellingPrice)}</td>
                    <td style={{ textTransform: 'capitalize' }}>{p.unit}</td>
                    <td>{p.reorderPoint}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon-only" onClick={() => setViewItem(p)} title="View" id={`view-product-${p.id}`}>
                          <Eye size={15} />
                        </button>
                        {can.manageProducts && (
                          <>
                            <button className="btn btn-ghost btn-icon-only" onClick={() => openEdit(p)} title="Edit" id={`edit-product-${p.id}`}>
                              <Edit2 size={15} />
                            </button>
                            <button className="btn btn-ghost btn-icon-only" style={{ color: '#ef4444' }} onClick={() => setDeleteItem(p)} title="Delete" id={`delete-product-${p.id}`}>
                              <Trash2 size={15} />
                            </button>
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

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editItem ? 'Edit Product' : 'Add New Product'}
        size="modal-lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting} id="btn-save-product">
              {submitting ? <span className="spinner" style={{ width: 16, height: 16 }} /> : null}
              {editItem ? 'Update Product' : 'Add Product'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          {/* Image Upload */}
          <div className="form-group">
            <label className="form-label">Product Image</label>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              {imagePreview ? (
                <div style={{ position: 'relative' }}>
                  <img src={imagePreview} alt="preview" style={{ width: 90, height: 90, borderRadius: 10, objectFit: 'cover', border: '2px solid #e2e8f0' }} />
                  <button
                    type="button"
                    onClick={() => { setImagePreview(null); setImageFile(null); }}
                    style={{ position: 'absolute', top: -8, right: -8, background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div
                  className="image-upload-area"
                  style={{ padding: 20, flex: 1, cursor: 'pointer' }}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload size={24} style={{ color: '#94a3b8', margin: '0 auto 8px', display: 'block' }} />
                  <p style={{ fontSize: 13, color: '#64748b' }}>Click to upload image</p>
                  <p style={{ fontSize: 11, color: '#94a3b8' }}>JPG, PNG, WebP · Max 2MB</p>
                </div>
              )}
              {!imagePreview && (
                <input type="file" ref={fileRef} accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} id="product-image-input" />
              )}
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Product Name <span className="required">*</span></label>
              <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Organic Brown Rice" id="product-name" />
            </div>
            <div className="form-group">
              <label className="form-label">SKU</label>
              <input className="form-input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="e.g. SKU-001" id="product-sku" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Product description..." id="product-desc" />
          </div>

          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} id="product-category">
                <option value="">Select category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Supplier</label>
              <select className="form-select" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} id="product-supplier">
                <option value="">Select supplier</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Unit</label>
              <select className="form-select" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} id="product-unit">
                {PRODUCT_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">Cost Price (₹)</label>
              <input type="number" className="form-input" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} placeholder="0.00" min="0" step="0.01" id="product-cost-price" />
            </div>
            <div className="form-group">
              <label className="form-label">Selling Price (₹)</label>
              <input type="number" className="form-input" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} placeholder="0.00" min="0" step="0.01" id="product-sell-price" />
            </div>
            <div className="form-group">
              <label className="form-label">Reorder Point</label>
              <input type="number" className="form-input" value={form.reorderPoint} onChange={(e) => setForm({ ...form, reorderPoint: e.target.value })} min="0" id="product-reorder" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Tags (comma-separated)</label>
            <input className="form-input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="e.g. organic, food, bulk" id="product-tags" />
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={!!viewItem} onClose={() => setViewItem(null)} title="Product Details">
        {viewItem && (
          <div>
            {viewItem.imageBase64 && (
              <img src={viewItem.imageBase64} alt={viewItem.name} style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 10, marginBottom: 16 }} />
            )}
            <div className="form-grid-2">
              <div><div className="form-label">Name</div><p>{viewItem.name}</p></div>
              <div><div className="form-label">SKU</div><p style={{ fontFamily: 'monospace' }}>{viewItem.sku || '—'}</p></div>
              <div><div className="form-label">Cost Price</div><p>{formatCurrency(viewItem.costPrice)}</p></div>
              <div><div className="form-label">Selling Price</div><p>{formatCurrency(viewItem.sellingPrice)}</p></div>
              <div><div className="form-label">Category</div><p>{getCategoryName(viewItem.categoryId)}</p></div>
              <div><div className="form-label">Supplier</div><p>{getSupplierName(viewItem.supplierId)}</p></div>
              <div><div className="form-label">Unit</div><p style={{ textTransform: 'capitalize' }}>{viewItem.unit}</p></div>
              <div><div className="form-label">Reorder Point</div><p>{viewItem.reorderPoint}</p></div>
            </div>
            {viewItem.description && (
              <div style={{ marginTop: 12 }}>
                <div className="form-label">Description</div>
                <p style={{ fontSize: 13, color: '#475569' }}>{viewItem.description}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title="Archive Product"
        message={`Are you sure you want to archive "${deleteItem?.name}"? It will be hidden from the catalog.`}
        confirmLabel="Archive"
        loading={deleting}
      />
    </div>
  );
};

export default ProductsPage;
