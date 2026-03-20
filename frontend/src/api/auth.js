import { get, patch, post } from './client';

const API_BASE_URL = 'http://localhost:8000';

export function getCurrentUser() {
    return get('/auth/me');
}

export function updateProfile(userData) {
    return patch('/auth/profile', userData);
}

export function logout() {
    return post('/auth/logout', {});
}

export function getGoogleLoginUrl(nextPath = '/') {
    const encodedNextPath = encodeURIComponent(nextPath || '/');
    return `${API_BASE_URL}/auth/google/login?next=${encodedNextPath}`;
}