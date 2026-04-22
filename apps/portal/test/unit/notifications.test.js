import {describe, expect, test, beforeEach} from 'vitest';
import NotificationParser, {clearURLParams} from '../../src/utils/notifications';

describe('notifications utils', () => {
    beforeEach(() => {
        window.history.replaceState({}, '', '/');
    });

    test('reads gift redemption params from action subscribe plus portal hash query', () => {
        window.history.replaceState({}, '', '/?action=subscribe&success=true#/portal/account?giftRedemption=true');

        expect(NotificationParser()).toMatchObject({
            type: 'giftRedeem',
            status: 'success',
            autoHide: true,
            duration: 5000,
            message: 'Gift redeemed! You\'re all set.'
        });
    });

    test('reads gift redemption params from legacy giftRedeem action', () => {
        window.history.replaceState({}, '', '/#/portal/account?action=giftRedeem&success=true');

        expect(NotificationParser()).toMatchObject({
            type: 'giftRedeem',
            status: 'success',
            autoHide: true,
            duration: 5000,
            message: 'Gift redeemed! You\'re all set.'
        });
    });

    test('builds tier/duration message when giftTier, giftCadence, and giftDuration params are present', () => {
        window.history.replaceState({}, '', '/?success=true&giftRedemption=true&giftTier=Ultra&giftCadence=month&giftDuration=1');

        expect(NotificationParser()).toMatchObject({
            type: 'giftRedeem',
            status: 'success',
            autoHide: true,
            duration: 5000,
            message: 'You now have access to Ultra for 1 month. Enjoy!'
        });
    });

    test('handles plural durations for the tier/duration message', () => {
        window.history.replaceState({}, '', '/?success=true&giftRedemption=true&giftTier=Premium&giftCadence=year&giftDuration=2');

        expect(NotificationParser()).toMatchObject({
            type: 'giftRedeem',
            status: 'success',
            message: 'You now have access to Premium for 2 years. Enjoy!'
        });
    });

    test('reads gift redemption failure params from action subscribe plus portal hash query', () => {
        window.history.replaceState({}, '', '/?action=subscribe&success=false#/portal/account?giftRedemption=true');

        expect(NotificationParser()).toMatchObject({
            type: 'giftRedeem',
            status: 'error',
            autoHide: false,
            duration: 3000
        });
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
