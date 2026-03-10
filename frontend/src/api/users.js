// Users API

import { get, post, del } from './client';

export function getUsers() {
    return get('/users/');
}

export function getUser(userId) {
    return get(`/users/${userId}`);
}

export function createUser(userData) {
    return post('/users/', userData);
}

export function deleteUser(userId) {
    return del(`/users/${userId}`);
}
