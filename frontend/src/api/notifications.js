import { get, post } from './client';

export function getNotifications({ limit = 20 } = {}) {
    const query = limit ? `?limit=${encodeURIComponent(limit)}` : '';
    return get(`/notifications${query}`);
}

export function getUnreadNotificationCount() {
    return get('/notifications/unread-count');
}

export function markNotificationRead(notificationId) {
    return post(`/notifications/${notificationId}/read`, {});
}

