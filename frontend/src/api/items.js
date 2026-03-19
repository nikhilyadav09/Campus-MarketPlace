// Items API

import { del, get, patch, post } from './client';

export function getItems(filters = {}) {
    const params = new URLSearchParams();
    if (filters.category_id) params.append('category_id', filters.category_id);
    if (filters.status) params.append('status', filters.status);
    if (filters.seller_id) params.append('seller_id', filters.seller_id);
    if (filters.exclude_seller_id) params.append('exclude_seller_id', filters.exclude_seller_id);

    const queryString = params.toString();
    return get(`/items/${queryString ? `?${queryString}` : ''}`);
}

export function getItem(itemId) {
    return get(`/items/${itemId}`);
}

export function getRecentlyListed() {
    return get('/items/recently-listed');
}

export function createItem(itemData) {
    return post('/items/', itemData);
}

export function updateItem(itemId, itemData) {
    return patch(`/items/${itemId}`, itemData);
}

export function deleteItem(itemId) {
    return del(`/items/${itemId}`);
}

export function markItemSold(itemId) {
    return post(`/items/${itemId}/sold`, {});
}