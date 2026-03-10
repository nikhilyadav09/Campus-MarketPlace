// Categories API

import { get, post, del } from './client';

export function getCategories(parentId = null) {
    const params = parentId ? `?parent_id=${parentId}` : '';
    return get(`/categories/${params}`);
}

export function getRootCategories() {
    return get('/categories/root');
}

export function getCategory(categoryId) {
    return get(`/categories/${categoryId}`);
}

export function createCategory(categoryData) {
    return post('/categories/', categoryData);
}

export function deleteCategory(categoryId) {
    return del(`/categories/${categoryId}`);
}
