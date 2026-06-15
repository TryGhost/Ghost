import type {NotificationOptions} from '../types';

interface ParsedNotification {
    type: NotificationOptions['type'];
    status: NotificationOptions['status'];
    autoHide: boolean;
    duration: number;
    giftErrorCode?: string | null;
}

const AUTH_TYPES = new Set(['signin', 'signup', 'signup-paid']);

export function parseNotificationFromUrl(): ParsedNotification | null {
    const search = new URLSearchParams(window.location.search || '');

    const action = search.get('action');
    const successParam = search.get('success');

    // Gift redemption return — checked BEFORE the auth branch because the
    // magic-link redirect carries both `giftRedemption=true` and
    // `action=signin&success=true` (mirrors Portal's ordering).
    if (search.get('giftRedemption') === 'true' && (successParam === 'true' || successParam === 'false')) {
        const isSuccess = successParam === 'true';
        return {
            type: 'giftRedeem',
            status: isSuccess ? 'success' : 'error',
            autoHide: isSuccess,
            duration: isSuccess ? 5000 : 3000,
            giftErrorCode: search.get('errorCode')
        };
    }

    if (action && AUTH_TYPES.has(action) && (successParam === 'true' || successParam === 'false')) {
        const isSuccess = successParam === 'true';
        return {
            type: action as 'signin' | 'signup' | 'signup-paid',
            status: isSuccess ? 'success' : 'error',
            autoHide: isSuccess,
            duration: 3000
        };
    }

    // Donation return for logged-in members: `?action=support&success=true`.
    if (action === 'support' && (successParam === 'true' || successParam === 'false')) {
        const isSuccess = successParam === 'true';
        return {
            type: 'support',
            status: isSuccess ? 'success' : 'error',
            autoHide: isSuccess,
            duration: 3000
        };
    }

    const stripe = search.get('stripe');
    if (stripe === 'success') {
        return {
            type: 'stripe:checkout',
            status: 'success',
            autoHide: true,
            duration: 3000
        };
    }

    return null;
}

export function clearNotificationParams(paramsToClear: string[] = ['action', 'success', 'stripe', 'giftRedemption', 'errorCode']): void {
    const qs = new URLSearchParams(window.location.search || '');
    let changed = false;
    paramsToClear.forEach((p) => {
        if (qs.has(p)) {
            qs.delete(p);
            changed = true;
        }
    });
    if (!changed) return;
    const newSearch = qs.toString();
    const url = window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash;
    window.history.replaceState({}, '', url);
}
