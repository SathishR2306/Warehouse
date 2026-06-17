// src/utils/helpers.js
import { format, formatDistanceToNow } from 'date-fns';

export const formatCurrency = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount || 0);
};

export const formatDate = (timestamp) => {
  if (!timestamp) return '—';
  try {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, 'dd MMM yyyy');
  } catch {
    return '—';
  }
};

export const formatDateTime = (timestamp) => {
  if (!timestamp) return '—';
  try {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, 'dd MMM yyyy, hh:mm a');
  } catch {
    return '—';
  }
};

export const timeAgo = (timestamp) => {
  if (!timestamp) return '—';
  try {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return '—';
  }
};

export const generateId = () => {
  return Math.random().toString(36).substr(2, 9).toUpperCase();
};

export const generateOrderNumber = (prefix = 'ORD') => {
  const date = format(new Date(), 'yyyyMMdd');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${date}-${rand}`;
};

export const truncate = (str, length = 40) => {
  if (!str) return '';
  return str.length > length ? str.substring(0, length) + '...' : str;
};

export const classNames = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

export const getInitials = (name = '') => {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
};

export const sortByDate = (arr, field = 'createdAt', dir = 'desc') => {
  return [...arr].sort((a, b) => {
    const aDate = a[field]?.toDate ? a[field].toDate() : new Date(a[field]);
    const bDate = b[field]?.toDate ? b[field].toDate() : new Date(b[field]);
    return dir === 'desc' ? bDate - aDate : aDate - bDate;
  });
};

export const calculateInventoryValue = (inventory, products) => {
  return inventory.reduce((total, inv) => {
    const product = products.find((p) => p.id === inv.productId);
    return total + (inv.quantity || 0) * (product?.costPrice || 0);
  }, 0);
};
