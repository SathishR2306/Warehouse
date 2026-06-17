// src/services/product.service.js
import { createDocument, getCollection, updateDocument, deleteDocument, where, orderBy } from './firestore.service';
import { compressAndConvertToBase64 } from '../utils/imageUtils';

const COLLECTION = 'products';

export const createProduct = async (data, imageFile) => {
  let imageBase64 = data.imageBase64 || null;
  if (imageFile) {
    imageBase64 = await compressAndConvertToBase64(imageFile);
  }
  return createDocument(COLLECTION, { ...data, imageBase64, isActive: true });
};

export const getProducts = async (filters = {}) => {
  const constraints = [];
  if (filters.categoryId) constraints.push(where('categoryId', '==', filters.categoryId));
  if (filters.supplierId) constraints.push(where('supplierId', '==', filters.supplierId));
  constraints.push(orderBy('createdAt', 'desc'));
  return getCollection(COLLECTION, constraints);
};

export const updateProduct = async (productId, data, imageFile) => {
  let updateData = { ...data };
  if (imageFile) {
    updateData.imageBase64 = await compressAndConvertToBase64(imageFile);
  }
  return updateDocument(COLLECTION, productId, updateData);
};

export const deleteProduct = async (productId) => {
  return updateDocument(COLLECTION, productId, { isActive: false });
};

export const hardDeleteProduct = async (productId) => {
  return deleteDocument(COLLECTION, productId);
};

// Categories
export const createCategory = async (data) => createDocument('categories', data);
export const getCategories = async () => getCollection('categories', [orderBy('name', 'asc')]);
export const updateCategory = async (id, data) => updateDocument('categories', id, data);
export const deleteCategory = async (id) => deleteDocument('categories', id);
