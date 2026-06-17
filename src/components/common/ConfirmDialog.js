// src/components/common/ConfirmDialog.js
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Delete', danger = true, loading = false }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title || 'Confirm Action'}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : null}
            {confirmLabel}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: danger ? '#fef2f2' : '#eff6ff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <AlertTriangle size={20} color={danger ? '#ef4444' : '#3b82f6'} />
        </div>
        <div>
          <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6 }}>{message}</p>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
