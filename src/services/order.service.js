// src/services/order.service.js
import {
  createDocument,
  getCollection,
  getDocument,
  where,
  orderBy,
  serverTimestamp,
  db,
} from './firestore.service';
import { doc, writeBatch, increment, collection } from 'firebase/firestore';
import { ORDER_STATUS } from '../constants';
import { generateOrderNumber } from '../utils/helpers';
import { logAction } from './audit.service';

const ORDER_COL = 'orders';
const ORDER_ITEMS_COL = 'order_items';
const INVENTORY_COL = 'inventory';
const TRANSACTIONS_COL = 'inventory_transactions';

export const createOrder = async (orderData, items) => {
  const orderNumber = generateOrderNumber(orderData.type === 'purchase' ? 'PO' : 'SO');
  const orderId = await createDocument(ORDER_COL, {
    ...orderData,
    orderNumber,
    status: ORDER_STATUS.PENDING,
    totalAmount: items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0),
  });

  for (const item of items) {
    await createDocument(ORDER_ITEMS_COL, { ...item, orderId, warehouseId: orderData.warehouseId });
  }

  // Audit log order creation
  await logAction({
    userId: orderData.createdBy || 'system',
    username: 'System',
    action: 'CREATE_ORDER',
    warehouseId: orderData.warehouseId,
    details: `Created order ${orderNumber} with ${items.length} items`,
    affectedRecordId: orderId,
    affectedCollection: ORDER_COL,
  });

  return orderId;
};

export const getOrders = async (filters = {}) => {
  const constraints = [orderBy('createdAt', 'desc')];
  if (filters.type) constraints.push(where('type', '==', filters.type));
  if (filters.status) constraints.push(where('status', '==', filters.status));
  return getCollection(ORDER_COL, constraints);
};

export const getOrderItems = async (orderId) => {
  return getCollection(ORDER_ITEMS_COL, [where('orderId', '==', orderId)]);
};

export const updateOrderStatus = async (orderId, status, updatedBy) => {
  const order = await getDocument(ORDER_COL, orderId);
  if (!order) throw new Error('Order not found');

  const items = await getOrderItems(orderId);
  const batch = writeBatch(db);

  // Stock Reservation Workflow
  // If order is sales order:
  // - Transition to APPROVED: Reserve stock (increase reservedQuantity)
  // - Transition to DISPATCHED/DELIVERED: Deduct stock (decrease quantity and reservedQuantity)
  if (order.type === 'sales') {
    if (status === ORDER_STATUS.APPROVED) {
      // Reserve stock
      for (const item of items) {
        // Find matching inventory
        const invQuery = await getCollection(INVENTORY_COL, [
          where('productId', '==', item.productId),
          where('warehouseId', '==', order.warehouseId),
        ]);
        if (invQuery.length > 0) {
          const invRef = doc(db, INVENTORY_COL, invQuery[0].id);
          batch.update(invRef, {
            reservedQuantity: increment(item.quantity),
          });
        }
      }
    } else if (status === ORDER_STATUS.DISPATCHED) {
      // Deduct from total stock and clear reservation
      for (const item of items) {
        const invQuery = await getCollection(INVENTORY_COL, [
          where('productId', '==', item.productId),
          where('warehouseId', '==', order.warehouseId),
        ]);
        if (invQuery.length > 0) {
          const inv = invQuery[0];
          const invRef = doc(db, INVENTORY_COL, inv.id);
          batch.update(invRef, {
            quantity: increment(-item.quantity),
            reservedQuantity: increment(-Math.min(item.quantity, inv.reservedQuantity || 0)),
          });

          // Log stock out transaction
          const txRef = doc(collection(db, TRANSACTIONS_COL));
          batch.set(txRef, {
            type: 'stock_out',
            productId: item.productId,
            warehouseId: order.warehouseId,
            shelfId: inv.shelfId || 'default',
            quantity: -item.quantity,
            notes: `Fulfillment for order ${order.orderNumber}`,
            orderId: orderId,
            performedBy: updatedBy,
            createdAt: serverTimestamp(),
          });
        }
      }
    }
  } else if (order.type === 'purchase' && status === ORDER_STATUS.DELIVERED) {
    // Purchase order fulfilled: Add to stock
    for (const item of items) {
      const invQuery = await getCollection(INVENTORY_COL, [
        where('productId', '==', item.productId),
        where('warehouseId', '==', order.warehouseId),
      ]);
      if (invQuery.length > 0) {
        const inv = invQuery[0];
        const invRef = doc(db, INVENTORY_COL, inv.id);
        batch.update(invRef, {
          quantity: increment(item.quantity),
        });
      } else {
        const invRef = doc(collection(db, INVENTORY_COL));
        batch.set(invRef, {
          productId: item.productId,
          warehouseId: order.warehouseId,
          shelfId: 'default',
          quantity: item.quantity,
          reservedQuantity: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Log stock in transaction
      const txRef = doc(collection(db, TRANSACTIONS_COL));
      batch.set(txRef, {
        type: 'stock_in',
        productId: item.productId,
        warehouseId: order.warehouseId,
        shelfId: 'default',
        quantity: item.quantity,
        notes: `Received from Purchase Order ${order.orderNumber}`,
        orderId: orderId,
        performedBy: updatedBy,
        createdAt: serverTimestamp(),
      });
    }
  }

  // Update order document status
  const orderRef = doc(db, ORDER_COL, orderId);
  batch.update(orderRef, {
    status,
    updatedBy,
    statusUpdatedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await batch.commit();

  // Audit log status change
  await logAction({
    userId: updatedBy || 'system',
    action: 'UPDATE_ORDER_STATUS',
    warehouseId: order.warehouseId,
    details: `Updated order ${order.orderNumber} status to ${status}`,
    affectedRecordId: orderId,
    affectedCollection: ORDER_COL,
  });
};

export const cancelOrder = async (orderId, reason, updatedBy) => {
  const order = await getDocument(ORDER_COL, orderId);
  if (!order) throw new Error('Order not found');

  const items = await getOrderItems(orderId);
  const batch = writeBatch(db);

  // If cancelling approved sales order, release reservations
  if (order.type === 'sales' && order.status === ORDER_STATUS.APPROVED) {
    for (const item of items) {
      const invQuery = await getCollection(INVENTORY_COL, [
        where('productId', '==', item.productId),
        where('warehouseId', '==', order.warehouseId),
      ]);
      if (invQuery.length > 0) {
        const inv = invQuery[0];
        const invRef = doc(db, INVENTORY_COL, inv.id);
        batch.update(invRef, {
          reservedQuantity: increment(-Math.min(item.quantity, inv.reservedQuantity || 0)),
        });
      }
    }
  }

  // Update status to cancelled
  const orderRef = doc(db, ORDER_COL, orderId);
  batch.update(orderRef, {
    status: ORDER_STATUS.CANCELLED,
    cancellationReason: reason,
    updatedBy,
    updatedAt: serverTimestamp(),
  });

  await batch.commit();

  // Audit log cancellation
  await logAction({
    userId: updatedBy || 'system',
    action: 'CANCEL_ORDER',
    warehouseId: order.warehouseId,
    details: `Cancelled order ${order.orderNumber}. Reason: ${reason}`,
    affectedRecordId: orderId,
    affectedCollection: ORDER_COL,
  });
};

export const getOrder = async (orderId) => getDocument(ORDER_COL, orderId);
