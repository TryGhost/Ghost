import {describe, it, expect} from 'vitest';
import {getDiscountedAmount, offerOffAmount, isRetentionOffer, isActiveOffer} from './pricing';
import type {Offer} from './api-client/types';

function offer(overrides: Partial<Offer>): Offer {
    return {
        id: 'o1',
        name: 'Test offer',
        type: 'percent',
        cadence: 'year',
        amount: 50,
        duration: 'once',
        status: 'active',
        redemption_type: 'signup',
        tier: {id: 't1', name: 'Silver'},
        ...overrides,
    };
}

describe('getDiscountedAmount', () => {
    it('subtracts a fixed amount (cents)', () => {
        expect(getDiscountedAmount(offer({type: 'fixed', amount: 1500, currency: 'usd'}), 5000)).toBe(3500);
    });

    it('never goes below zero', () => {
        expect(getDiscountedAmount(offer({type: 'fixed', amount: 9000}), 5000)).toBe(0);
    });

    it('applies a percentage', () => {
        expect(getDiscountedAmount(offer({type: 'percent', amount: 40}), 5000)).toBe(3000);
    });

    it('leaves the price unchanged for trials', () => {
        expect(getDiscountedAmount(offer({type: 'trial', amount: 14}), 5000)).toBe(5000);
    });
});

describe('offerOffAmount', () => {
    it('formats fixed as a currency amount', () => {
        expect(offerOffAmount(offer({type: 'fixed', amount: 1500, currency: 'usd'}), 'en')).toBe('$15');
    });

    it('formats percent with a sign', () => {
        expect(offerOffAmount(offer({type: 'percent', amount: 40}))).toBe('40%');
    });

    it('returns the day count for trials', () => {
        expect(offerOffAmount(offer({type: 'trial', amount: 14}))).toBe('14');
    });
});

describe('isRetentionOffer', () => {
    it('detects retention offers', () => {
        expect(isRetentionOffer(offer({redemption_type: 'retention'}))).toBe(true);
        expect(isRetentionOffer(offer({redemption_type: 'signup'}))).toBe(false);
    });
});

describe('isActiveOffer', () => {
    it('is true for an active offer with a tier', () => {
        expect(isActiveOffer(offer({}))).toBe(true);
    });

    it('is false when archived', () => {
        expect(isActiveOffer(offer({status: 'archived'}))).toBe(false);
    });

    it('allows a null-tier offer only when it is retention', () => {
        expect(isActiveOffer(offer({tier: undefined, redemption_type: 'retention'}))).toBe(true);
        expect(isActiveOffer(offer({tier: undefined, redemption_type: 'signup'}))).toBe(false);
    });
});
