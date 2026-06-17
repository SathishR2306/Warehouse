// src/services/audit.service.js
import { createDocument, getCollection, orderBy, limit, where } from './firestore.service';

const AUDIT_COL = 'audit_logs';

/**
 * Log a critical WMS system action.
 * Every audit log entry must contain a valid warehouseId for query scoping.
 */
export const logAction = async ({
  userId,
  username,
  action,
  warehouseId,
  details = '',
  affectedRecordId = '',
  affectedCollection = '',
}) => {
  try {
    if (!warehouseId) {
      console.warn('Cannot write audit log without a valid warehouseId');
      return null;
    }
    
    return await createDocument(AUDIT_COL, {
      userId: userId || 'system',
      username: username || 'System',
      action,
      warehouseId,
      details,
      affectedRecordId,
      affectedCollection,
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
    return null;
  }
};

/**
 * Fetch logs for a specific warehouse.
 */
export const getAuditLogs = async (warehouseId, maxLimit = 200) => {
  return getCollection(AUDIT_COL, [
    where('warehouseId', '==', warehouseId),
    orderBy('createdAt', 'desc'),
    limit(maxLimit),
  ]);
};
