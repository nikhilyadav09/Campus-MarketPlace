import { get, post } from './client';

export function getCurrentUser() {
    return get('/auth/me');
}

export function login(credentials) {
    return post('/auth/login', credentials);
}

export function register(userData) {
    return post('/auth/register', userData);
}

export function logout() {
    return post('/auth/logout', {});
}