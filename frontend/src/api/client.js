const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function fetchAPI(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

    const defaultHeaders = {
        'Content-Type': 'application/json',
    };

    const config = {
        credentials: 'include',
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    };

    const response = await fetch(url, config);

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'An error occurred' }));
        throw new Error(error.error || error.message || error.detail || `HTTP error! status: ${response.status}`);
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
}

export function get(endpoint) {
    return fetchAPI(endpoint, { method: 'GET' });
}

export function post(endpoint, data) {
    return fetchAPI(endpoint, {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export function patch(endpoint, data) {
    return fetchAPI(endpoint, {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
}

export function del(endpoint) {
    return fetchAPI(endpoint, { method: 'DELETE' });
}