// src/hooks/useWarehouseCollection.js
import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Real-time Firestore collection hook that automatically scopes queries
 * to the current user's warehouseId.
 *
 * @param {string} collectionName - Firestore collection name
 * @param {Array} extraConstraints - Additional Firestore query constraints
 */
const useWarehouseCollection = (collectionName, extraConstraints = []) => {
  const { warehouseId } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!warehouseId) {
      setLoading(false);
      setData([]);
      return;
    }

    setLoading(true);
    const constraints = [where('warehouseId', '==', warehouseId), ...extraConstraints];
    const q = query(collection(db, collectionName), ...constraints);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setData(docs);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error(`Error in useWarehouseCollection(${collectionName}):`, err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, warehouseId]);

  return { data, loading, error };
};

export default useWarehouseCollection;
