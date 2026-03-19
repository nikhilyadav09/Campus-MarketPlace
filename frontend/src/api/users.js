// Users API

import { get } from './client';

export function getUsers() {
    return get('/users/');
}

export function getUser(userId) {
    return get(`/users/${userId}`);
}
