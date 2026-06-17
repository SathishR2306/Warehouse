// src/pages/UserManagementPage.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  UserPlus, Search, Shield, ShieldCheck, Users,
  ToggleLeft, ToggleRight, Eye, EyeOff, Lock, User, AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUsersByWarehouse, createUserAccount, toggleUserActive } from '../services/auth.service';
import { ROLES } from '../constants';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';
import { getInitials, timeAgo } from '../utils/helpers';

const ROLE_META = {
  admin: { label: 'Admin', color: '#6366f1', bg: '#e0e7ff', icon: ShieldCheck },
  manager: { label: 'Manager', color: '#0ea5e9', bg: '#e0f2fe', icon: Shield },
  staff: { label: 'Staff', color: '#64748b', bg: '#f1f5f9', icon: User },
};

const UserManagementPage = () => {
  const { userProfile, warehouseId, isAdmin, role } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!warehouseId) return;
    try {
      setLoading(true);
      const data = await getUsersByWarehouse(warehouseId);
      setUsers(data);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [warehouseId]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleActive = async (user) => {
    if (user.uid === userProfile?.uid) {
      toast.error('You cannot deactivate your own account.');
      return;
    }
    if (user.role === ROLES.ADMIN && !isAdmin) {
      toast.error('Only admins can manage admin accounts.');
      return;
    }
    try {
      await toggleUserActive(user.uid, !user.isActive);
      toast.success(`User ${user.isActive ? 'deactivated' : 'reactivated'} successfully.`);
      fetchUsers();
    } catch (err) {
      toast.error('Failed to update user status.');
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  // Determine which roles the current user can create
  const canCreateRoles = [];
  if (isAdmin) {
    canCreateRoles.push(ROLES.MANAGER, ROLES.STAFF);
  } else if (role === ROLES.MANAGER) {
    canCreateRoles.push(ROLES.STAFF);
  }

  const canCreateUsers = canCreateRoles.length > 0;

  return (
    <div>
      {/* Header Actions */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div className="flex items-center gap-3">
            <div className="search-bar">
              <Search size={16} />
              <input
                className="form-input"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: 38, width: 260 }}
                id="user-search"
              />
            </div>
            <select
              className="form-select"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              style={{ width: 140 }}
              id="user-filter-role"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
            </select>
          </div>
          {canCreateUsers && (
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
              id="create-user-btn"
            >
              <UserPlus size={16} />
              Create User
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="user-stats-grid">
        {Object.entries(ROLE_META).map(([key, meta]) => {
          const count = users.filter((u) => u.role === key && u.isActive).length;
          return (
            <div key={key} className="user-stat-card">
              <div className="user-stat-icon" style={{ background: meta.bg, color: meta.color }}>
                <meta.icon size={20} />
              </div>
              <div>
                <div className="user-stat-value">{count}</div>
                <div className="user-stat-label">{meta.label}s</div>
              </div>
            </div>
          );
        })}
        <div className="user-stat-card">
          <div className="user-stat-icon" style={{ background: '#fef3c7', color: '#f59e0b' }}>
            <Users size={20} />
          </div>
          <div>
            <div className="user-stat-value">{users.length}</div>
            <div className="user-stat-label">Total Users</div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="table-wrapper">
          {loading ? (
            <div className="empty-state" style={{ padding: 60 }}>
              <span className="spinner" />
              <p style={{ marginTop: 16 }}>Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="empty-state" style={{ padding: 60 }}>
              <div className="empty-state-icon"><Users size={24} /></div>
              <h3>No users found</h3>
              <p>{searchTerm || filterRole !== 'all' ? 'Try different search criteria' : 'Create your first team member'}</p>
            </div>
          ) : (
            <table className="table" id="users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  {(isAdmin || role === 'manager') && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const meta = ROLE_META[u.role] || ROLE_META.staff;
                  return (
                    <tr key={u.uid || u.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="avatar" style={{ width: 36, height: 36, fontSize: 12 }}>
                            {getInitials(u.displayName || u.username || 'U')}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{u.displayName || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: 13, color: '#475569', fontFamily: 'monospace' }}>
                          {u.username || '—'}
                        </span>
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: meta.bg,
                            color: meta.color,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <meta.icon size={12} />
                          {meta.label}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${u.isActive ? 'status-active' : 'status-inactive'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: '#64748b' }}>
                        {timeAgo(u.createdAt)}
                      </td>
                      {(isAdmin || role === 'manager') && (
                        <td style={{ textAlign: 'right' }}>
                          {u.role !== ROLES.ADMIN && (isAdmin || (role === 'manager' && u.role === 'staff')) && (
                            <button
                              className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-success'}`}
                              onClick={() => handleToggleActive(u)}
                              title={u.isActive ? 'Deactivate' : 'Reactivate'}
                              style={{ gap: 4 }}
                            >
                              {u.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                              {u.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          warehouseId={warehouseId}
          createdByRole={role}
          createdByUid={userProfile?.uid}
          createdByUsername={userProfile?.username || userProfile?.displayName}
          allowedRoles={canCreateRoles}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchUsers();
          }}
        />
      )}
    </div>
  );
};

/* ======== Create User Modal ======== */
const CreateUserModal = ({ warehouseId, createdByRole, createdByUid, createdByUsername, allowedRoles, onClose, onCreated }) => {
  const [form, setForm] = useState({
    username: '',
    displayName: '',
    password: '',
    confirmPassword: '',
    role: allowedRoles[allowedRoles.length - 1] || ROLES.STAFF, // Default to lowest allowed role
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

    if (form.username.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(form.username)) {
      setError('Username can only contain letters, numbers, dots, hyphens and underscores.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await createUserAccount({
        username: form.username,
        displayName: form.displayName,
        password: form.password,
        role: form.role,
        warehouseId,
        createdByRole,
        createdByUid,
        createdByUsername,
      });
      toast.success(`${form.role.charAt(0).toUpperCase() + form.role.slice(1)} account created successfully!`);
      onCreated();
    } catch (err) {
      const msg = err.code === 'auth/email-already-in-use'
        ? 'This username is already taken in your warehouse.'
        : err.message || 'Failed to create user.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputIcon = (Icon) => (
    <Icon size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Create New User"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading} id="create-user-submit">
            {loading ? (
              <span className="spinner" style={{ width: 16, height: 16, borderTopColor: 'white' }} />
            ) : (
              <>
                <UserPlus size={16} />
                Create User
              </>
            )}
          </button>
        </>
      }
    >
      {error && (
        <div className="auth-error" style={{ background: 'rgba(239,68,68,0.06)', marginBottom: 16 }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Display Name */}
        <div className="form-group">
          <label className="form-label">
            Display Name<span className="required">*</span>
          </label>
          <div style={{ position: 'relative' }}>
            {inputIcon(User)}
            <input
              type="text"
              className="form-input"
              placeholder="Full name"
              value={form.displayName}
              onChange={handleChange('displayName')}
              required
              style={{ paddingLeft: 42 }}
              id="create-user-display-name"
            />
          </div>
        </div>

        {/* Username */}
        <div className="form-group">
          <label className="form-label">
            Username<span className="required">*</span>
          </label>
          <div style={{ position: 'relative' }}>
            {inputIcon(User)}
            <input
              type="text"
              className="form-input"
              placeholder="e.g. john.doe"
              value={form.username}
              onChange={handleChange('username')}
              required
              style={{ paddingLeft: 42 }}
              id="create-user-username"
            />
          </div>
          <div className="form-hint">Used for login (letters, numbers, dots, hyphens, underscores)</div>
        </div>

        {/* Role */}
        <div className="form-group">
          <label className="form-label">
            Role<span className="required">*</span>
          </label>
          <select
            className="form-select"
            value={form.role}
            onChange={handleChange('role')}
            id="create-user-role"
          >
            {allowedRoles.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>
          <div className="form-hint">
            {form.role === ROLES.MANAGER
              ? 'Managers can create staff accounts and manage operations.'
              : 'Staff have read-only access to operations.'}
          </div>
        </div>

        <div className="form-grid-2">
          {/* Password */}
          <div className="form-group">
            <label className="form-label">
              Password<span className="required">*</span>
            </label>
            <div style={{ position: 'relative' }}>
              {inputIcon(Lock)}
              <input
                type={showPass ? 'text' : 'password'}
                className="form-input"
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={handleChange('password')}
                required
                style={{ paddingLeft: 42, paddingRight: 42 }}
                id="create-user-password"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}
              >
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label className="form-label">
              Confirm Password<span className="required">*</span>
            </label>
            <div style={{ position: 'relative' }}>
              {inputIcon(Lock)}
              <input
                type="password"
                className="form-input"
                placeholder="Repeat password"
                value={form.confirmPassword}
                onChange={handleChange('confirmPassword')}
                required
                style={{ paddingLeft: 42 }}
                id="create-user-confirm-password"
              />
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default UserManagementPage;
