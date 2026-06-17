// src/components/common/Badge.js
import React from 'react';

const Badge = ({ label, type, className = '' }) => {
  const typeClass = `status-${type}`.replace(/[^a-z0-9_-]/gi, '_');
  return (
    <span className={`badge ${typeClass} ${className}`}>
      {label}
    </span>
  );
};

export const StatusBadge = ({ status }) => {
  const labels = {
    active: 'Active', inactive: 'Inactive',
    draft: 'Draft', confirmed: 'Confirmed', processing: 'Processing',
    dispatched: 'Dispatched', delivered: 'Delivered', cancelled: 'Cancelled',
    stock_in: 'Stock In', stock_out: 'Stock Out', adjustment: 'Adjustment',
    transfer: 'Transfer', return: 'Return',
    low_stock: 'Low Stock', expiry_alert: 'Expiry Alert',
    order_update: 'Order Update', system: 'System',
    purchase: 'Purchase', sales: 'Sales',
  };
  return <Badge label={labels[status] || status} type={status} />;
};

export default Badge;
