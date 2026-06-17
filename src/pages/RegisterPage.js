// src/pages/RegisterPage.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Boxes, Eye, EyeOff, AlertCircle, ArrowRight, Lock,
  User, Building2, Phone, MapPin, Warehouse, Hash, Mail
} from 'lucide-react';
import { registerWarehouse } from '../services/auth.service';
import toast from 'react-hot-toast';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    warehouseId: '',
    warehouseName: '',
    adminUsername: '',
    adminDisplayName: '',
    email: '',
    password: '',
    confirmPassword: '',
    contactNumber: '',
    address: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validations
    if (form.warehouseId.length < 3) {
      setError('Warehouse ID must be at least 3 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(form.warehouseId)) {
      setError('Warehouse ID can only contain letters, numbers, hyphens and underscores.');
      return;
    }
    if (form.adminUsername.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(form.adminUsername)) {
      setError('Username can only contain letters, numbers, dots, hyphens and underscores.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await registerWarehouse({
        warehouseId: form.warehouseId,
        warehouseName: form.warehouseName,
        adminUsername: form.adminUsername,
        password: form.password,
        adminDisplayName: form.adminDisplayName,
        email: form.email,
        contactNumber: form.contactNumber,
        address: form.address,
      });
      toast.success('Warehouse registered successfully! Please login.');
      navigate('/login');
    } catch (err) {
      const msg = err.code === 'auth/email-already-in-use'
        ? 'This Warehouse ID and Username combination is already taken.'
        : err.message || 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputIcon = (Icon) => (
    <Icon size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
  );

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 520 }}>
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <Boxes size={28} color="white" />
          </div>
        </div>

        <h1 className="auth-title">Register Warehouse</h1>
        <p className="auth-subtitle">Set up your warehouse and create your Admin account</p>

        {error && (
          <div className="auth-error">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Section: Warehouse Details */}
          <div className="auth-section-label">
            <Building2 size={14} />
            Warehouse Details
          </div>

          <div className="auth-form-grid">
            {/* Warehouse ID */}
            <div className="auth-input-group">
              <label className="auth-label">Warehouse ID</label>
              <div style={{ position: 'relative' }}>
                {inputIcon(Hash)}
                <input
                  type="text"
                  className="auth-input"
                  placeholder="e.g. WH-001"
                  value={form.warehouseId}
                  onChange={handleChange('warehouseId')}
                  required
                  style={{ paddingLeft: 42 }}
                  id="reg-warehouse-id"
                />
              </div>
              <div className="auth-hint">Unique identifier for your warehouse</div>
            </div>

            {/* Warehouse Name */}
            <div className="auth-input-group">
              <label className="auth-label">Warehouse Name</label>
              <div style={{ position: 'relative' }}>
                {inputIcon(Warehouse)}
                <input
                  type="text"
                  className="auth-input"
                  placeholder="e.g. Central Distribution Hub"
                  value={form.warehouseName}
                  onChange={handleChange('warehouseName')}
                  required
                  style={{ paddingLeft: 42 }}
                  id="reg-warehouse-name"
                />
              </div>
            </div>
          </div>

          <div className="auth-form-grid">
            {/* Contact */}
            <div className="auth-input-group">
              <label className="auth-label">Contact Number</label>
              <div style={{ position: 'relative' }}>
                {inputIcon(Phone)}
                <input
                  type="tel"
                  className="auth-input"
                  placeholder="+91 98765 43210"
                  value={form.contactNumber}
                  onChange={handleChange('contactNumber')}
                  required
                  style={{ paddingLeft: 42 }}
                  id="reg-contact"
                />
              </div>
            </div>

            {/* Address */}
            <div className="auth-input-group">
              <label className="auth-label">Address</label>
              <div style={{ position: 'relative' }}>
                {inputIcon(MapPin)}
                <input
                  type="text"
                  className="auth-input"
                  placeholder="City, State, Country"
                  value={form.address}
                  onChange={handleChange('address')}
                  required
                  style={{ paddingLeft: 42 }}
                  id="reg-address"
                />
              </div>
            </div>
          </div>

          {/* Section: Admin Account */}
          <div className="auth-section-label" style={{ marginTop: 8 }}>
            <User size={14} />
            Admin Account
          </div>

          <div className="auth-form-grid">
            {/* Admin Display Name */}
            <div className="auth-input-group">
              <label className="auth-label">Admin Name</label>
              <div style={{ position: 'relative' }}>
                {inputIcon(User)}
                <input
                  type="text"
                  className="auth-input"
                  placeholder="John Doe"
                  value={form.adminDisplayName}
                  onChange={handleChange('adminDisplayName')}
                  required
                  style={{ paddingLeft: 42 }}
                  id="reg-admin-name"
                />
              </div>
            </div>

            {/* Admin Username */}
            <div className="auth-input-group">
              <label className="auth-label">Username</label>
              <div style={{ position: 'relative' }}>
                {inputIcon(User)}
                <input
                  type="text"
                  className="auth-input"
                  placeholder="admin"
                  value={form.adminUsername}
                  onChange={handleChange('adminUsername')}
                  required
                  style={{ paddingLeft: 42 }}
                  id="reg-admin-username"
                />
              </div>
              <div className="auth-hint">Used for login (no spaces)</div>
            </div>
          </div>

          {/* Email */}
          <div className="auth-input-group">
            <label className="auth-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              {inputIcon(Mail)}
              <input
                type="email"
                className="auth-input"
                placeholder="admin@company.com"
                value={form.email}
                onChange={handleChange('email')}
                required
                style={{ paddingLeft: 42 }}
                id="reg-email"
              />
            </div>
          </div>

          <div className="auth-form-grid">
            {/* Password */}
            <div className="auth-input-group">
              <label className="auth-label">Password</label>
              <div style={{ position: 'relative' }}>
                {inputIcon(Lock)}
                <input
                  type={showPass ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={handleChange('password')}
                  required
                  style={{ paddingLeft: 42, paddingRight: 42 }}
                  id="reg-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="auth-input-group">
              <label className="auth-label">Confirm Password</label>
              <div style={{ position: 'relative' }}>
                {inputIcon(Lock)}
                <input
                  type="password"
                  className="auth-input"
                  placeholder="Repeat password"
                  value={form.confirmPassword}
                  onChange={handleChange('confirmPassword')}
                  required
                  style={{ paddingLeft: 42 }}
                  id="reg-confirm-password"
                />
              </div>
            </div>
          </div>

          <button type="submit" className="auth-btn" disabled={loading} id="reg-submit">
            {loading ? (
              <span className="spinner" style={{ width: 18, height: 18, borderTopColor: 'white' }} />
            ) : (
              <>Register Warehouse <ArrowRight size={16} /></>
            )}
          </button>
        </form>

        <div className="auth-info-box">
          <div className="auth-info-title">🏢 What happens next?</div>
          <div>Your warehouse will be created along with your Admin account.</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>You can then invite Managers and Staff from the dashboard.</div>
        </div>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
