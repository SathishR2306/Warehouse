// src/constants/index.js

export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff',
};

export const ROLE_PERMISSIONS = {
  admin: {
    manageUsers: true,
    createManager: true,
    createStaff: true,
    manageProducts: true,
    manageInventory: true,
    manageWarehouses: true,
    manageSuppliers: true,
    manageOrders: true,
    manageCategories: true,
    viewAuditLogs: true,
    deleteProducts: true,
    adjustInventory: true,
    approveOrders: true,
    viewOrders: true,
    viewDashboard: true,
  },
  manager: {
    manageUsers: false,
    createManager: false,
    createStaff: true,
    manageProducts: true,
    manageInventory: true,
    manageWarehouses: true,
    manageSuppliers: true,
    manageOrders: true,
    manageCategories: true,
    viewAuditLogs: false,
    deleteProducts: false,
    adjustInventory: true,
    approveOrders: true,
    viewOrders: true,
    viewDashboard: true,
  },
  staff: {
    manageUsers: false,
    createManager: false,
    createStaff: false,
    manageProducts: false,
    manageInventory: false,
    manageWarehouses: false,
    manageSuppliers: false,
    manageOrders: false,
    manageCategories: false,
    viewAuditLogs: false,
    deleteProducts: false,
    adjustInventory: false,
    approveOrders: false,
    viewOrders: true,
    viewDashboard: true,
  },
};

export const ORDER_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  PICKING: 'picking',
  PACKING: 'packing',
  DISPATCHED: 'dispatched',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

export const ORDER_TYPES = {
  PURCHASE: 'purchase',
  SALES: 'sales',
};

export const TRANSACTION_TYPES = {
  STOCK_IN: 'stock_in',
  STOCK_OUT: 'stock_out',
  ADJUSTMENT: 'adjustment',
  TRANSFER: 'transfer',
  RETURN: 'return',
};

export const NOTIFICATION_TYPES = {
  LOW_STOCK: 'low_stock',
  EXPIRY_ALERT: 'expiry_alert',
  ORDER_UPDATE: 'order_update',
  SYSTEM: 'system',
};

export const LOW_STOCK_THRESHOLD = 10;

export const PRODUCT_UNITS = [
  'pieces', 'kg', 'grams', 'liters', 'ml', 'boxes', 'packs', 'pallets', 'rolls', 'bags',
];

export const PAYMENT_TERMS = [
  'Net 30', 'Net 60', 'Net 90', 'Immediate', 'COD',
];

export const STATUS_COLORS = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-gray-100 text-gray-600',
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-blue-100 text-blue-700',
  picking: 'bg-indigo-100 text-indigo-700',
  packing: 'bg-violet-100 text-violet-700',
  dispatched: 'bg-purple-100 text-purple-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
  stock_in: 'bg-emerald-100 text-emerald-700',
  stock_out: 'bg-red-100 text-red-700',
  adjustment: 'bg-blue-100 text-blue-700',
  transfer: 'bg-purple-100 text-purple-700',
  return: 'bg-orange-100 text-orange-700',
  low_stock: 'bg-red-100 text-red-700',
  expiry_alert: 'bg-orange-100 text-orange-700',
  order_update: 'bg-blue-100 text-blue-700',
  system: 'bg-gray-100 text-gray-700',
};
