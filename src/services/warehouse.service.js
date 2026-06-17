// src/services/warehouse.service.js
import { createDocument, getCollection, updateDocument, deleteDocument, where, orderBy } from './firestore.service';

const WAREHOUSE_COL = 'warehouses';
const SHELF_COL = 'shelves';

export const createWarehouse = async (data) => createDocument(WAREHOUSE_COL, { ...data, isActive: true });
export const getWarehouses = async () => getCollection(WAREHOUSE_COL, [where('isActive', '==', true), orderBy('name', 'asc')]);
export const updateWarehouse = async (id, data) => updateDocument(WAREHOUSE_COL, id, data);
export const deleteWarehouse = async (id) => updateDocument(WAREHOUSE_COL, id, { isActive: false });

export const createShelf = async (data) => createDocument(SHELF_COL, { ...data, isActive: true });
export const getShelves = async (warehouseId) => {
  const constraints = [where('isActive', '==', true)];
  if (warehouseId) constraints.push(where('warehouseId', '==', warehouseId));
  constraints.push(orderBy('name', 'asc'));
  return getCollection(SHELF_COL, constraints);
};
export const updateShelf = async (id, data) => updateDocument(SHELF_COL, id, data);
export const deleteShelf = async (id) => updateDocument(SHELF_COL, id, { isActive: false });
