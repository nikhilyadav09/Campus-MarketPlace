// Custom hook for items data

import { useState, useEffect, useCallback } from 'react';
import { getItems, getItem } from '../api/items';

export function useItems(filters = {}) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchItems = useCallback(async () => {
        // Skip fetch if filters is null (waiting for required data)
        if (filters === null) {
            setLoading(true);
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const data = await getItems(filters);
            setItems(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [JSON.stringify(filters)]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    return { items, loading, error, refetch: fetchItems };
}

export function useItem(itemId) {
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchItem = useCallback(async () => {
        if (!itemId) return;
        try {
            setLoading(true);
            setError(null);
            const data = await getItem(itemId);
            setItem(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [itemId]);

    useEffect(() => {
        fetchItem();
    }, [fetchItem]);

    return { item, loading, error, refetch: fetchItem };
}
