// src/services/supplier.service.js
import { createDocument, getCollection, updateDocument, deleteDocument, where, orderBy } from './firestore.service';

const COLLECTION = 'suppliers';

export const createSupplier = async (data) => createDocument(COLLECTION, { ...data, isActive: true });
export const getSuppliers = async () => getCollection(COLLECTION, [where('isActive', '==', true), orderBy('name', 'asc')]);
export const updateSupplier = async (id, data) => updateDocument(COLLECTION, id, data);
export const deleteSupplier = async (id) => updateDocument(COLLECTION, id, { isActive: false });
