import { get } from './client';

export function getPaymentConfig() {
    return get('/payments/config');
}

