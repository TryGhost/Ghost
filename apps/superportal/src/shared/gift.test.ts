import {describe, it, expect} from 'vitest';
import {getGiftDurationLabel, getGiftRedemptionErrorMessage, getGiftRedemptionSuccessMessage} from './gift';
import type {MemberRecord} from './api-client';
import type {Translator} from '../types';

const t: Translator = (key, vars) => {
    if (!vars) return key;
    return Object.entries(vars).reduce((acc, [k, v]) => acc.replace(`{${k}}`, String(v)), key);
};

describe('getGiftDurationLabel', () => {
    it('labels single and multiple periods', () => {
        expect(getGiftDurationLabel({cadence: 'year', duration: 1}, t)).toBe('1 year');
        expect(getGiftDurationLabel({cadence: 'year', duration: 3}, t)).toBe('3 years');
        expect(getGiftDurationLabel({cadence: 'month', duration: 1}, t)).toBe('1 month');
        expect(getGiftDurationLabel({cadence: 'month', duration: 6}, t)).toBe('6 months');
    });
});

describe('getGiftRedemptionErrorMessage', () => {
    it('maps every gift error code to its message', () => {
        const cases: Array<[string, string]> = [
            ['GIFT_REDEEMED', 'This gift has already been redeemed.'],
            ['GIFT_CONSUMED', 'This gift has already been consumed.'],
            ['GIFT_EXPIRED', 'This gift has expired.'],
            ['GIFT_REFUNDED', 'This gift has been refunded.'],
            ['GIFT_PAID_MEMBER', 'You already have an active subscription.'],
            ['TOKEN_EXPIRED', 'Email confirmation link expired.']
        ];
        for (const [code, subtitle] of cases) {
            expect(getGiftRedemptionErrorMessage(code, t)).toEqual({
                title: 'Gift could not be redeemed',
                subtitle
            });
        }
    });

    it('falls back for unknown or missing codes', () => {
        expect(getGiftRedemptionErrorMessage('WHO_KNOWS', t).subtitle).toBe('Something went wrong, please try again later.');
        expect(getGiftRedemptionErrorMessage(null, t).subtitle).toBe('Something went wrong, please try again later.');
    });
});

describe('getGiftRedemptionSuccessMessage', () => {
    function record(overrides: Partial<MemberRecord> = {}): MemberRecord {
        return {
            id: 'm1',
            uuid: 'm1',
            email: 'a@b.c',
            subscriptions: [{
                id: 's1',
                status: 'active',
                start_date: '2026-01-01',
                cancel_at_period_end: false,
                price: {id: 'p1', price_id: 'p1', currency: 'usd', amount: 500, interval: 'year'},
                tier: {id: 't1', name: 'Gold', expiry_at: '2027-06-09T00:00:00.000Z'}
            }],
            ...overrides
        } as MemberRecord;
    }

    it('builds the success message from the active subscription tier', () => {
        const msg = getGiftRedemptionSuccessMessage(record(), t);
        expect(msg).toContain('You now have access to Gold until ');
        expect(msg).toContain('. Enjoy!');
    });

    it('returns null without an expiring active subscription', () => {
        expect(getGiftRedemptionSuccessMessage(null, t)).toBeNull();
        expect(getGiftRedemptionSuccessMessage(record({subscriptions: []}), t)).toBeNull();
    });
});
