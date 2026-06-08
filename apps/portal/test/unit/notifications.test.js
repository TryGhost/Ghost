import {describe, expect, test, beforeEach} from 'vitest';
import NotificationParser, {clearURLParams} from '../../src/utils/notifications';

describe('notifications utils', () => {
    beforeEach(() => {
        window.history.replaceState({}, '', '/');
    });

    test('reads gift redemption params from action subscribe plus portal hash query', () => {
        window.history.replaceState({}, '', '/?action=subscribe&success=true#/portal/account?giftRedemption=true');

        expect(NotificationParser()).toEqual({
            type: 'giftRedeem',
            status: 'success',
            autoHide: true,
            duration: 5000
        });
    });

    test('reads gift redemption failure params from action subscribe plus portal hash query', () => {
        window.history.replaceState({}, '', '/?action=subscribe&success=false#/portal/account?giftRedemption=true');

        expect(NotificationParser()).toMatchObject({
            type: 'giftRedeem',
            status: 'error',
            autoHide: false,
            duration: 3000,
            message: {
                title: 'Gift could not be redeemed',
                subtitle: 'Something went wrong, please try again later.'
            }
        });
    });

    test('resolves a known errorCode into the gift redemption error message', () => {
        window.history.replaceState({}, '', '/?action=subscribe&success=false&errorCode=GIFT_EXPIRED#/portal/account?giftRedemption=true');

        expect(NotificationParser()).toMatchObject({
            type: 'giftRedeem',
            status: 'error',
            message: {
                title: 'Gift could not be redeemed',
                subtitle: 'This gift has expired.'
            }
        });
    });

    test('ignores errorCode on gift redemption success', () => {
        window.history.replaceState({}, '', '/?action=subscribe&success=true&errorCode=SHOULD_NOT_HAPPEN#/portal/account?giftRedemption=true');

        const result = NotificationParser();
        expect(result).toMatchObject({
            type: 'giftRedeem',
            status: 'success'
        });
        expect(result).not.toHaveProperty('message');
    });

    test('clears matching params from the search query while preserving the hash path', () => {
        window.history.replaceState({}, '', '/?ref=mail&action=subscribe&success=true#/portal/account?giftRedemption=true');

        clearURLParams(['action', 'success', 'giftRedemption']);

        expect(window.location.search).toBe('?ref=mail');
        expect(window.location.hash).toBe('#/portal/account');
    });

    test('clears matching params from the portal hash query while preserving the hash path', () => {
        window.history.replaceState({}, '', '/?ref=mail#/portal/account?action=giftRedeem&success=true');

        clearURLParams(['action', 'success']);

        expect(window.location.search).toBe('?ref=mail');
        expect(window.location.hash).toBe('#/portal/account');
    });
});
