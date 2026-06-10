import {describe, expect, it} from 'vitest';
import {
    formatPriceAmount,
    getActiveStripeSubscriptions,
    getOfferDisplayData,
    getSubscriptionData,
    groupSubscriptionsByTier,
    hasActiveStripeSubscriptions,
    isComplimentary,
    isGift,
    priceLabel,
    validityDetails
} from './subscription-data';
import type {MemberSubscription} from '@tryghost/admin-x-framework/api/members';

function makeSubscription(overrides: Record<string, unknown> = {}): MemberSubscription {
    return {
        id: 'sub_1',
        customer: {id: 'cus_1', name: 'Jane', email: 'jane@example.com'},
        plan: {id: 'plan_1', nickname: 'Monthly', interval: 'month', currency: 'USD', amount: 500},
        status: 'active',
        start_date: '2025-01-15T12:00:00.000Z',
        current_period_end: '2025-07-15T12:00:00.000Z',
        cancel_at_period_end: false,
        price: {
            id: 'price_1',
            price_id: 'price_1',
            nickname: 'Monthly',
            amount: 500,
            currency: 'USD',
            type: 'recurring',
            interval: 'month',
            tier: {id: 'tier_1', tier_id: 'tier_1', name: 'Gold'}
        },
        tier: {id: 'tier_1', name: 'Gold', slug: 'gold', active: true, type: 'paid'},
        offer: null,
        ...overrides
    } as MemberSubscription;
}

describe('formatPriceAmount', () => {
    it('formats whole prices without decimals', () => {
        expect(formatPriceAmount(500)).toBe('5');
        expect(formatPriceAmount(123400)).toBe('1,234');
    });

    it('keeps trailing zeros on fractional prices', () => {
        expect(formatPriceAmount(550)).toBe('5.50');
        expect(formatPriceAmount(999)).toBe('9.99');
    });

    it('returns 0 for zero amounts', () => {
        expect(formatPriceAmount(0)).toBe('0');
    });
});

describe('getSubscriptionData', () => {
    it('derives presentation data for an active subscription', () => {
        const data = getSubscriptionData(makeSubscription());

        expect(data.startDate).toBe('15 Jan 2025');
        expect(data.validUntil).toBe('15 Jul 2025');
        expect(data.hasEnded).toBe(false);
        expect(data.willEndSoon).toBe(false);
        expect(data.price.currencySymbol).toBe('$');
        expect(data.price.nonDecimalAmount).toBe(5);
        expect(data.priceLabel).toBeUndefined();
        expect(data.validityDetails).toBe('Renews 15 Jul 2025');
    });

    it('marks subscriptions set to cancel', () => {
        const data = getSubscriptionData(makeSubscription({cancel_at_period_end: true}));

        expect(data.willEndSoon).toBe(true);
        expect(data.validityDetails).toBe('Has access until 15 Jul 2025');
    });

    it('marks canceled subscriptions', () => {
        const data = getSubscriptionData(makeSubscription({status: 'canceled', cancel_at_period_end: true}));

        expect(data.hasEnded).toBe(true);
        expect(data.validityDetails).toBe('Ended 15 Jul 2025');
    });

    it('hides the validity date for immediately canceled subscriptions', () => {
        const data = getSubscriptionData(makeSubscription({status: 'canceled'}));

        expect(data.validUntil).toBe('');
        expect(data.validityDetails).toBe('Ended');
    });

    it('detects complimentary subscriptions and their expiry', () => {
        const sub = makeSubscription({
            id: '',
            plan: {id: 'plan_1', nickname: 'Complimentary', interval: 'year', currency: 'USD', amount: 0},
            tier: {id: 'tier_1', name: 'Gold', slug: 'gold', active: true, type: 'paid', expiry_at: '2025-12-31T00:00:00.000Z'}
        });
        const data = getSubscriptionData(sub);

        expect(isComplimentary(sub)).toBe(true);
        expect(data.compExpiry).toBe('31 Dec 2025');
        expect(data.validityDetails).toBe('Expires 31 Dec 2025');
    });

    it('detects gift subscriptions', () => {
        const sub = makeSubscription({
            id: '',
            plan: {id: 'plan_1', nickname: 'Gift subscription', interval: 'year', currency: 'USD', amount: 0}
        });

        expect(isGift(sub)).toBe(true);
        expect(getSubscriptionData(sub).validityDetails).toBe('');
    });

    it('labels active trials', () => {
        const inAMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        const data = getSubscriptionData(makeSubscription({trial_end_at: inAMonth, status: 'trialing'}));

        expect(data.trialUntil).toBeDefined();
        expect(data.priceLabel).toBe('Free trial');
        expect(data.validityDetails).toContain('– Ends');
    });

    it('exposes discounted prices when the next payment differs', () => {
        const data = getSubscriptionData(makeSubscription({
            next_payment: {
                amount: 250,
                original_amount: 500,
                currency: 'USD',
                discount: {offer_id: 'offer_1', end: null}
            }
        }));

        expect(data.hasActiveDiscount).toBe(true);
        expect(data.discountedPrice?.amount).toBe(250);
        expect(data.originalPrice?.amount).toBe(500);
    });
});

describe('priceLabel', () => {
    it('uses custom price nicknames but not Monthly/Yearly', () => {
        const base = getSubscriptionData(makeSubscription());

        expect(priceLabel({...base, price: {...base.price, nickname: 'Supporter'}})).toBe('Supporter');
        expect(priceLabel({...base, price: {...base.price, nickname: 'Yearly'}})).toBeUndefined();
    });
});

describe('validityDetails separator', () => {
    it('prefixes a separator when a price label is shown', () => {
        const base = getSubscriptionData(makeSubscription());

        expect(validityDetails(base, true)).toBe(' – Renews 15 Jul 2025');
    });
});

describe('getOfferDisplayData', () => {
    it('describes signup offers', () => {
        expect(getOfferDisplayData({id: 'o1', name: 'Black Friday', type: 'percent', amount: 20}))
            .toEqual({label: 'Signup offer', detail: 'Black Friday (20% off)'});
        expect(getOfferDisplayData({id: 'o1', name: 'Trial', type: 'trial', amount: 14}))
            .toEqual({label: 'Signup offer', detail: 'Trial (14 days free)'});
        expect(getOfferDisplayData({id: 'o1', name: 'Fixed', type: 'fixed', amount: 500, currency: 'USD'}))
            .toEqual({label: 'Signup offer', detail: 'Fixed ($5 off)'});
    });

    it('describes retention offers', () => {
        expect(getOfferDisplayData({
            id: 'o1',
            name: 'Stay',
            type: 'percent',
            amount: 50,
            duration: 'repeating',
            duration_in_months: 3,
            redemption_type: 'retention'
        })).toEqual({label: 'Retention offer', detail: '50% off for 3 months'});

        expect(getOfferDisplayData({
            id: 'o1',
            name: 'Stay',
            type: 'percent',
            amount: 100,
            duration: 'repeating',
            duration_in_months: 2,
            redemption_type: 'retention'
        })).toEqual({label: 'Retention offer', detail: '2 months free'});

        expect(getOfferDisplayData({
            id: 'o1',
            name: 'Stay',
            type: 'percent',
            amount: 10,
            duration: 'forever',
            redemption_type: 'retention'
        })).toEqual({label: 'Retention offer', detail: '10% off forever'});
    });
});

describe('groupSubscriptionsByTier', () => {
    it('groups subscriptions under their tier', () => {
        const groups = groupSubscriptionsByTier([makeSubscription(), makeSubscription({id: 'sub_2'})]);

        expect(groups).toHaveLength(1);
        expect(groups[0].name).toBe('Gold');
        expect(groups[0].subscriptions).toHaveLength(2);
    });

    it('separates different tiers', () => {
        const other = makeSubscription({
            id: 'sub_2',
            tier: {id: 'tier_2', name: 'Silver', slug: 'silver', active: true, type: 'paid'},
            price: {
                id: 'price_2',
                price_id: 'price_2',
                nickname: 'Monthly',
                amount: 300,
                currency: 'USD',
                type: 'recurring',
                interval: 'month',
                tier: {id: 'tier_2', tier_id: 'tier_2', name: 'Silver'}
            }
        });
        const groups = groupSubscriptionsByTier([makeSubscription(), other]);

        expect(groups.map(group => group.name)).toEqual(['Gold', 'Silver']);
        expect(groups[1].subscriptions).toHaveLength(1);
    });
});

describe('active stripe subscriptions', () => {
    it('treats active, trialing, unpaid and past_due as active', () => {
        for (const status of ['active', 'trialing', 'unpaid', 'past_due']) {
            expect(hasActiveStripeSubscriptions([makeSubscription({status})])).toBe(true);
        }
        expect(hasActiveStripeSubscriptions([makeSubscription({status: 'canceled'})])).toBe(false);
        expect(hasActiveStripeSubscriptions([])).toBe(false);
        expect(hasActiveStripeSubscriptions(undefined)).toBe(false);
    });

    it('returns the active subscriptions', () => {
        const active = makeSubscription();
        const canceled = makeSubscription({id: 'sub_2', status: 'canceled'});

        expect(getActiveStripeSubscriptions([active, canceled])).toEqual([active]);
    });
});
