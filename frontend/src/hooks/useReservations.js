// Custom hook for reservations data

import { useState, useEffect, useCallback } from 'react';
import { getReservations, getReservation } from '../api/reservations';

export function useReservations(filters = {}) {
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchReservations = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getReservations(filters);
            setReservations(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [JSON.stringify(filters)]);

    useEffect(() => {
        fetchReservations();
    }, [fetchReservations]);

    return { reservations, loading, error, refetch: fetchReservations };
}

export function useReservation(reservationId) {
    const [reservation, setReservation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchReservation = useCallback(async () => {
        if (!reservationId) return;
        try {
            setLoading(true);
            setError(null);
            const data = await getReservation(reservationId);
            setReservation(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [reservationId]);

    useEffect(() => {
        fetchReservation();
    }, [fetchReservation]);

    return { reservation, loading, error, refetch: fetchReservation };
}
