// src/hooks/useCollection.js
import { useState, useEffect } from 'react';
import { subscribeToCollection } from '../services/firestore.service';

/**
 * Real-time Firestore collection hook
 * @param {string} collectionName - Firestore collection name
 * @param {Array} constraints - Firestore query constraints (where, orderBy, limit)
 * @param {boolean} enabled - Whether to run the query
 */
const useCollection = (collectionName, constraints = [], enabled = true) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // eslint-disable-line no-unused-vars

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToCollection(
      collectionName,
      constraints,
      (docs) => {
        setData(docs);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, enabled]);

  return { data, loading, error };
};

export default useCollection;
