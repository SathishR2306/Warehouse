// src/services/auth.service.js
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  getAuth,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, getDocs, collection, query, where, serverTimestamp } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { auth, db } from '../config/firebase';
import { ROLES } from '../constants';
import app from '../config/firebase';
import { logAction } from './audit.service';

// Build a composite email for Firebase Auth from warehouseId + username
const buildCompositeEmail = (username, warehouseId) => {
  const sanitizedUser = username.toLowerCase().replace(/[^a-z0-9_.-]/g, '');
  const sanitizedWh = warehouseId.toLowerCase().replace(/[^a-z0-9_.-]/g, '');
  return `${sanitizedUser}__${sanitizedWh}@wareflow.internal`;
};

/**
 * Register a new warehouse and create the first Admin account.
 */
export const registerWarehouse = async ({
  warehouseId,
  warehouseName,
  adminUsername,
  password,
  adminDisplayName,
  email,
  contactNumber,
  address,
}) => {
  // Check if warehouseId already exists
  const whDoc = await getDoc(doc(db, 'warehouses', warehouseId));
  if (whDoc.exists()) {
    throw new Error('A warehouse with this ID already exists. Please choose a different Warehouse ID.');
  }

  const compositeEmail = buildCompositeEmail(adminUsername, warehouseId);

  // Create Firebase Auth user
  const userCredential = await createUserWithEmailAndPassword(auth, compositeEmail, password);
  const user = userCredential.user;

  await updateProfile(user, { displayName: adminDisplayName });

  // Create warehouse document
  await setDoc(doc(db, 'warehouses', warehouseId), {
    warehouseId,
    name: warehouseName,
    email,
    contactNumber,
    address,
    createdBy: user.uid,
    isActive: true,
    status: 'active',
    subscriptionPlan: 'standard',
    isDeleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Create user profile document
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    username: adminUsername,
    email,
    displayName: adminDisplayName,
    role: ROLES.ADMIN,
    warehouseId,
    isActive: true,
    status: 'active',
    lastLogin: serverTimestamp(),
    createdBy: 'system',
    isDeleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Log audit action
  await logAction({
    userId: user.uid,
    username: adminUsername,
    action: 'REGISTER_WAREHOUSE',
    warehouseId,
    details: `Warehouse ${warehouseName} registered with Admin ${adminUsername}`,
    affectedRecordId: warehouseId,
    affectedCollection: 'warehouses',
  });

  return user;
};

/**
 * Login user with Warehouse ID, Username, and Password.
 */
export const loginUser = async (warehouseId, username, password) => {
  const compositeEmail = buildCompositeEmail(username, warehouseId);

  const userCredential = await signInWithEmailAndPassword(auth, compositeEmail, password);
  const user = userCredential.user;

  const userDoc = await getDoc(doc(db, 'users', user.uid));
  if (!userDoc.exists()) throw new Error('User profile not found.');

  const userData = userDoc.data();
  if (!userData.isActive || userData.isDeleted) {
    throw new Error('Your account is inactive or has been disabled. Contact your warehouse admin.');
  }

  // Update last login
  await updateDoc(doc(db, 'users', user.uid), {
    lastLogin: serverTimestamp(),
  });

  // Log successful login
  await logAction({
    userId: user.uid,
    username: userData.username,
    action: 'USER_LOGIN',
    warehouseId,
    details: `User ${userData.username} successfully logged in`,
    affectedRecordId: user.uid,
    affectedCollection: 'users',
  });

  return { ...user, ...userData };
};

/**
 * Create a new user account within a warehouse (Admin/Manager only).
 * Uses a secondary Firebase app to avoid signing out the current user.
 */
export const createUserAccount = async ({
  username,
  displayName,
  password,
  role,
  warehouseId,
  createdByRole,
  createdByUid,
  createdByUsername,
}) => {
  // Validate permissions
  if (role === ROLES.ADMIN) {
    throw new Error('Cannot create additional admin accounts.');
  }
  if (role === ROLES.MANAGER && createdByRole !== ROLES.ADMIN) {
    throw new Error('Only admins can create manager accounts.');
  }
  if (role === ROLES.STAFF && createdByRole !== ROLES.ADMIN && createdByRole !== ROLES.MANAGER) {
    throw new Error('Only admins and managers can create staff accounts.');
  }

  // Check if username already exists in this warehouse
  const usersQuery = query(
    collection(db, 'users'),
    where('warehouseId', '==', warehouseId),
    where('username', '==', username)
  );
  const existing = await getDocs(usersQuery);
  if (!existing.empty) {
    throw new Error('A user with this username already exists in your warehouse.');
  }

  const compositeEmail = buildCompositeEmail(username, warehouseId);

  // Use a secondary app instance so we don't sign out the current admin
  const secondaryApp = initializeApp(app.options, 'SecondaryApp_' + Date.now());
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, compositeEmail, password);
    const newUser = userCredential.user;

    await updateProfile(newUser, { displayName });

    // Create user profile in Firestore
    await setDoc(doc(db, 'users', newUser.uid), {
      uid: newUser.uid,
      username,
      email: compositeEmail,
      displayName,
      role,
      warehouseId,
      isActive: true,
      status: 'active',
      lastLogin: null,
      createdBy: createdByUid || 'admin',
      isDeleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Sign out from the secondary app to clean up
    await signOut(secondaryAuth);

    // Delete the secondary app
    await deleteApp(secondaryApp);

    // Log the action
    await logAction({
      userId: createdByUid || 'admin',
      username: createdByUsername || 'Admin',
      action: 'CREATE_USER',
      warehouseId,
      details: `Created new user ${username} with role ${role}`,
      affectedRecordId: newUser.uid,
      affectedCollection: 'users',
    });

    return { uid: newUser.uid, username, displayName, role };
  } catch (error) {
    // Clean up secondary app on error
    try { await deleteApp(secondaryApp); } catch (_) { /* ignore cleanup errors */ }
    throw error;
  }
};

/**
 * Get all users belonging to a specific warehouse.
 */
export const getUsersByWarehouse = async (warehouseId) => {
  const usersQuery = query(
    collection(db, 'users'),
    where('warehouseId', '==', warehouseId)
  );
  const snapshot = await getDocs(usersQuery);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/**
 * Toggle user active status (deactivate/reactivate).
 */
export const toggleUserActive = async (uid, isActive) => {
  await updateDoc(doc(db, 'users', uid), {
    isActive,
    updatedAt: serverTimestamp(),
  });
};

export const logoutUser = () => signOut(auth);

export const getUserProfile = async (uid) => {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (!userDoc.exists()) return null;
  return { id: userDoc.id, ...userDoc.data() };
};

export const updateUserProfile = async (uid, data) => {
  await updateDoc(doc(db, 'users', uid), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};
