// src/services/notification.service.js
import {
  createDocument,
  getCollection,
  updateDocument,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  doc,
  db,
} from './firestore.service';
import { NOTIFICATION_TYPES, LOW_STOCK_THRESHOLD } from '../constants';

const COLLECTION = 'notifications';

export const createNotification = async (data) => {
  return createDocument(COLLECTION, {
    ...data,
    isRead: false,
  });
};

export const getNotifications = async (userId, unreadOnly = false) => {
  const constraints = [orderBy('createdAt', 'desc'), limit(50)];
  if (unreadOnly) constraints.push(where('isRead', '==', false));
  return getCollection(COLLECTION, constraints);
};

export const markAsRead = async (notificationId) => {
  return updateDocument(COLLECTION, notificationId, { isRead: true, readAt: serverTimestamp() });
};

export const markAllAsRead = async (userId) => {
  const unread = await getCollection(COLLECTION, [
    where('isRead', '==', false),
  ]);

  const batch = writeBatch(db);
  unread.forEach((n) => {
    const ref = doc(db, COLLECTION, n.id);
    batch.update(ref, { isRead: true, readAt: serverTimestamp() });
  });
  await batch.commit();
};

export const generateLowStockNotifications = async (inventory, products) => {
  const lowStockItems = inventory.filter(
    (item) => item.quantity <= (products.find((p) => p.id === item.productId)?.reorderPoint || LOW_STOCK_THRESHOLD)
  );

  for (const item of lowStockItems) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) continue;

    await createNotification({
      type: NOTIFICATION_TYPES.LOW_STOCK,
      title: 'Low Stock Alert',
      message: `${product.name} is running low. Current stock: ${item.quantity} ${product.unit || 'units'}.`,
      productId: item.productId,
      warehouseId: item.warehouseId,
      currentStock: item.quantity,
      priority: item.quantity === 0 ? 'critical' : 'high',
    });
  }
};

export const deleteNotification = async (id) => {
  const { deleteDocument } = await import('./firestore.service');
  return deleteDocument(COLLECTION, id);
};
