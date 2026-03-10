// Reservations API

import { get, post } from './client';

export function getReservations(filters = {}) {
    const params = new URLSearchParams();
    if (filters.item_id) params.append('item_id', filters.item_id);
    if (filters.buyer_id) params.append('buyer_id', filters.buyer_id);
    if (filters.status) params.append('status', filters.status);

    const queryString = params.toString();
    return get(`/reservations/${queryString ? `?${queryString}` : ''}`);
}

export function getReservation(reservationId) {
    return get(`/reservations/${reservationId}`);
}

export function createReservation(itemId, buyerId) {
    return post('/reservations/', { item_id: itemId, buyer_id: buyerId });
}

export function confirmReservation(reservationId) {
    return post(`/reservations/${reservationId}/confirm`);
}

export function cancelReservation(reservationId, userId) {
    return post(`/reservations/${reservationId}/cancel`, { user_id: userId });
}
