// src/pages/LoginPage.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Boxes, Eye, EyeOff, AlertCircle, ArrowRight, Lock, User, Hash } from 'lucide-react';
import { loginUser } from '../services/auth.service';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ warehouseId: '', username: '', password: '' });
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
    setLoading(true);
    try {
      await loginUser(form.warehouseId, form.username, form.password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      const msg = err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password'
        ? 'Invalid credentials. Check your Warehouse ID, Username, and Password.'
        : err.code === 'auth/user-not-found'
        ? 'No account found. Check your Warehouse ID and Username.'
        : err.message || 'Login failed. Please try again.';
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
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <Boxes size={28} color="white" />
          </div>
        </div>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your WareFlow account</p>

        {/* Error */}
        {error && (
          <div className="auth-error">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
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
                id="login-warehouse-id"
              />
            </div>
          </div>

          {/* Username */}
          <div className="auth-input-group">
            <label className="auth-label">Username</label>
            <div style={{ position: 'relative' }}>
              {inputIcon(User)}
              <input
                type="text"
                className="auth-input"
                placeholder="Your username"
                value={form.username}
                onChange={handleChange('username')}
                required
                style={{ paddingLeft: 42 }}
                id="login-username"
              />
            </div>
          </div>

          {/* Password */}
          <div className="auth-input-group">
            <label className="auth-label">Password</label>
            <div style={{ position: 'relative' }}>
              {inputIcon(Lock)}
              <input
                type={showPass ? 'text' : 'password'}
                className="auth-input"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange('password')}
                required
                style={{ paddingLeft: 42, paddingRight: 42 }}
                id="login-password"
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

          <button type="submit" className="auth-btn" disabled={loading} id="login-submit">
            {loading ? (
              <span className="spinner" style={{ width: 18, height: 18, borderTopColor: 'white' }} />
            ) : (
              <>Sign In <ArrowRight size={16} /></>
            )}
          </button>
        </form>

        {/* Info Box */}
        <div className="auth-info-box">
          <div className="auth-info-title">🔑 How to sign in</div>
          <div>Use your Warehouse ID, Username, and Password to login.</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>Your admin will provide these credentials when creating your account.</div>
        </div>

        <div className="auth-footer">
          Need a new warehouse?{' '}
          <Link to="/register" style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>
            Register warehouse
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
