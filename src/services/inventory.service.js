// src/services/inventory.service.js
import {
  getCollection,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  increment,
  collection,
  doc,
  db,
} from './firestore.service';
import { TRANSACTION_TYPES, LOW_STOCK_THRESHOLD } from '../constants';

const INVENTORY_COL = 'inventory';
const TRANSACTIONS_COL = 'inventory_transactions';

export const getInventory = async (filters = {}) => {
  const constraints = [];
  if (filters.warehouseId) constraints.push(where('warehouseId', '==', filters.warehouseId));
  if (filters.productId) constraints.push(where('productId', '==', filters.productId));
  return getCollection(INVENTORY_COL, constraints);
};

export const getInventoryItem = async (productId, warehouseId, shelfId) => {
  const items = await getCollection(INVENTORY_COL, [
    where('productId', '==', productId),
    where('warehouseId', '==', warehouseId),
    where('shelfId', '==', shelfId),
  ]);
  return items[0] || null;
};

export const stockIn = async ({ productId, warehouseId, shelfId, quantity, costPrice, batchNumber, expiryDate, notes, performedBy }) => {
  const batch = writeBatch(db);

  // Check if inventory record exists
  const existing = await getInventoryItem(productId, warehouseId, shelfId);

  if (existing) {
    const invRef = doc(db, INVENTORY_COL, existing.id);
    batch.update(invRef, {
      quantity: increment(quantity),
      updatedAt: serverTimestamp(),
    });
  } else {
    const invRef = doc(collection(db, INVENTORY_COL));
    batch.set(invRef, {
      productId,
      warehouseId,
      shelfId,
      quantity,
      reservedQuantity: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  // Log transaction
  const txRef = doc(collection(db, TRANSACTIONS_COL));
  batch.set(txRef, {
    type: TRANSACTION_TYPES.STOCK_IN,
    productId,
    warehouseId,
    shelfId,
    quantity,
    costPrice: costPrice || 0,
    batchNumber: batchNumber || '',
    expiryDate: expiryDate || null,
    notes: notes || '',
    performedBy,
    createdAt: serverTimestamp(),
  });

  await batch.commit();
};

export const stockOut = async ({ productId, warehouseId, shelfId, quantity, notes, performedBy, orderId }) => {
  const existing = await getInventoryItem(productId, warehouseId, shelfId);
  if (!existing) throw new Error('Inventory record not found.');
  if (existing.quantity < quantity) throw new Error('Insufficient stock.');

  const batch = writeBatch(db);

  const invRef = doc(db, INVENTORY_COL, existing.id);
  batch.update(invRef, {
    quantity: increment(-quantity),
    updatedAt: serverTimestamp(),
  });

  const txRef = doc(collection(db, TRANSACTIONS_COL));
  batch.set(txRef, {
    type: TRANSACTION_TYPES.STOCK_OUT,
    productId,
    warehouseId,
    shelfId,
    quantity: -quantity,
    notes: notes || '',
    orderId: orderId || null,
    performedBy,
    createdAt: serverTimestamp(),
  });

  await batch.commit();
};

export const adjustInventory = async ({ productId, warehouseId, shelfId, newQuantity, reason, performedBy }) => {
  const existing = await getInventoryItem(productId, warehouseId, shelfId);
  if (!existing) throw new Error('Inventory record not found.');

  const diff = newQuantity - existing.quantity;
  const batch = writeBatch(db);

  const invRef = doc(db, INVENTORY_COL, existing.id);
  batch.update(invRef, {
    quantity: newQuantity,
    updatedAt: serverTimestamp(),
  });

  const txRef = doc(collection(db, TRANSACTIONS_COL));
  batch.set(txRef, {
    type: TRANSACTION_TYPES.ADJUSTMENT,
    productId,
    warehouseId,
    shelfId,
    quantity: diff,
    previousQuantity: existing.quantity,
    newQuantity,
    reason: reason || '',
    performedBy,
    createdAt: serverTimestamp(),
  });

  await batch.commit();
};

export const getTransactionHistory = async (filters = {}) => {
  const constraints = [orderBy('createdAt', 'desc')];
  if (filters.productId) constraints.push(where('productId', '==', filters.productId));
  if (filters.warehouseId) constraints.push(where('warehouseId', '==', filters.warehouseId));
  if (filters.type) constraints.push(where('type', '==', filters.type));
  if (filters.limit) constraints.push(limit(filters.limit));
  return getCollection(TRANSACTIONS_COL, constraints);
};

export const getLowStockItems = async (threshold = LOW_STOCK_THRESHOLD) => {
  const all = await getCollection(INVENTORY_COL);
  return all.filter((item) => item.quantity <= threshold && item.quantity >= 0);
};
