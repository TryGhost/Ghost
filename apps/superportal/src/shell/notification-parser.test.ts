import {describe, it, expect, afterEach, vi} from 'vitest';
import {parseNotificationFromUrl} from './notification-parser';

function stubSearch(search: string): void {
    vi.stubGlobal('window', {location: {search}});
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('parseNotificationFromUrl', () => {
    it('parses gift redemption success before the auth branch', () => {
        stubSearch('?giftRedemption=true&action=signin&success=true');

        const parsed = parseNotificationFromUrl();

        expect(parsed?.type).toBe('giftRedeem');
        expect(parsed?.status).toBe('success');
        expect(parsed?.autoHide).toBe(true);
    });

    it('parses gift redemption errors with the error code', () => {
        stubSearch('?giftRedemption=true&success=false&errorCode=GIFT_EXPIRED');

        const parsed = parseNotificationFromUrl();

        expect(parsed?.type).toBe('giftRedeem');
        expect(parsed?.status).toBe('error');
        expect(parsed?.giftErrorCode).toBe('GIFT_EXPIRED');
    });

    it('still parses plain auth notifications', () => {
        stubSearch('?action=signin&success=true');

        const parsed = parseNotificationFromUrl();

        expect(parsed?.type).toBe('signin');
        expect(parsed?.status).toBe('success');
    });
});
