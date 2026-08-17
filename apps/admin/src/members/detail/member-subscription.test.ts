import {classifyMemberSubscription, formatSubscriptionAmount, formatSubscriptionInterval, getSubscriptionPriceLabel, getSubscriptionStatusLabel, getSubscriptionValidityLabel, groupSubscriptionsByTier} from './member-subscription';
import {describe, expect, it} from 'vitest';
import type {MemberSubscription} from '@tryghost/admin-x-framework/api/members';

function makeSub(overrides: Partial<MemberSubscription> = {}): MemberSubscription {
    // Mid-day UTC so local-tz formatting doesn't cross a day boundary in tests.
    return {
        id: 'sub_1',
        customer: {id: 'cus_1', name: null, email: 'x@x.co'},
        plan: {id: 'plan_1', nickname: 'Monthly', interval: 'month', currency: 'usd', amount: 500},
        status: 'active',
        start_date: '2026-01-01T12:00:00.000Z',
        current_period_end: '2026-02-01T12:00:00.000Z',
        cancel_at_period_end: false,
        price: {id: 'price_1', price_id: 'price_1', nickname: 'Monthly', amount: 500, currency: 'usd', type: 'recurring', interval: 'month'},
        tier: {id: 'tier_1', name: 'Bronze', slug: 'bronze', active: true, type: 'paid'},
        offer: null,
        ...overrides
    };
}

describe('classifyMemberSubscription', () => {
    it('classifies a real Stripe subscription as paid', () => {
        expect(classifyMemberSubscription(makeSub())).toBe('paid');
    });

    it('classifies "Complimentary" plan with an empty-string Stripe id as complimentary', () => {
        // Ember requires BOTH: id must be falsy (no real Stripe sub — the members
        // BREAD service synthesises comps/gifts with `id: ''`) AND nickname must match.
        expect(classifyMemberSubscription(makeSub({
            id: '',
            plan: {...makeSub().plan, nickname: 'Complimentary'}
        }))).toBe('complimentary');
    });

    it('is case-insensitive on the plan nickname (Ember uses toLowerCase)', () => {
        expect(classifyMemberSubscription(makeSub({
            id: '',
            plan: {...makeSub().plan, nickname: 'complimentary'}
        }))).toBe('complimentary');
    });

    it('classifies "Gift Subscription" plan with an empty-string Stripe id as gift', () => {
        expect(classifyMemberSubscription(makeSub({
            id: '',
            plan: {...makeSub().plan, nickname: 'Gift Subscription'}
        }))).toBe('gift');
    });

    it('does NOT classify a real paid subscription named "Complimentary" as complimentary', () => {
        // A Stripe sub id present means it's real — even if the price was named
        // "Complimentary" by accident. Ember's `!sub.id` guard prevents this.
        expect(classifyMemberSubscription(makeSub({
            id: 'sub_real',
            plan: {...makeSub().plan, nickname: 'Complimentary'}
        }))).toBe('paid');
    });
});

describe('formatSubscriptionAmount', () => {
    it('formats whole amounts without decimals', () => {
        expect(formatSubscriptionAmount(500, 'usd')).toBe('$5');
        expect(formatSubscriptionAmount(1000, 'eur')).toBe('€10');
    });

    it('formats fractional amounts with two decimals', () => {
        expect(formatSubscriptionAmount(499, 'usd')).toBe('$4.99');
    });

    it('includes locale thousands separators (matching the Ember gh-price-amount helper)', () => {
        // Bug caught in the earlier subscription attempt: raw string interpolation
        // dropped the thousands separator that Ember toLocaleString provides.
        // Locale-tolerant: accept both `,` (en-US) and `.` (many EU locales), so
        // this passes whichever locale the runtime is set to.
        expect(formatSubscriptionAmount(1000000, 'usd')).toMatch(/^\$10[.,]000$/);
        expect(formatSubscriptionAmount(1234567, 'usd')).toMatch(/^\$12[.,]345[.,]67$/);
    });

    it('formats zero', () => {
        expect(formatSubscriptionAmount(0, 'usd')).toBe('$0');
    });
});

describe('formatSubscriptionInterval', () => {
    it('maps the Stripe interval to Ember copy', () => {
        expect(formatSubscriptionInterval('month')).toBe('monthly');
        expect(formatSubscriptionInterval('year')).toBe('yearly');
    });
});

describe('getSubscriptionStatusLabel', () => {
    it('is Active for a running paid subscription', () => {
        expect(getSubscriptionStatusLabel(makeSub())).toBe('Active');
    });

    it('is Canceled once the subscription has been canceled', () => {
        expect(getSubscriptionStatusLabel(makeSub({status: 'canceled'}))).toBe('Canceled');
    });

    it('is Canceled when set to cancel at period end', () => {
        expect(getSubscriptionStatusLabel(makeSub({cancel_at_period_end: true}))).toBe('Canceled');
    });

    it('is Active for a complimentary subscription with no id', () => {
        expect(getSubscriptionStatusLabel(makeSub({
            id: '',
            plan: {...makeSub().plan, nickname: 'Complimentary'}
        }))).toBe('Active');
    });
});

describe('getSubscriptionValidityLabel', () => {
    it('renders "Renews <date>" for a normal active subscription (no "on", matching Ember validityDetails)', () => {
        expect(getSubscriptionValidityLabel(makeSub())).toBe('Renews 1 Feb 2026');
    });

    it('renders "Has access until <date>" when set to cancel at period end', () => {
        expect(getSubscriptionValidityLabel(makeSub({cancel_at_period_end: true}))).toBe('Has access until 1 Feb 2026');
    });

    it('renders "Ended <date>" for a canceled sub whose period is still ending', () => {
        expect(getSubscriptionValidityLabel(makeSub({status: 'canceled', cancel_at_period_end: true}))).toBe('Ended 1 Feb 2026');
    });

    it('is empty for a subscription canceled immediately (Ember blanks validUntil to avoid a stale date)', () => {
        expect(getSubscriptionValidityLabel(makeSub({status: 'canceled', cancel_at_period_end: false}))).toBe('');
    });

    it('renders "Expires <date>" for a complimentary sub with a tier expiry (UTC, matching Ember compExpiry)', () => {
        // Mid-day UTC — same output UTC or local, so the format is unambiguous.
        expect(getSubscriptionValidityLabel(makeSub({
            id: '',
            plan: {...makeSub().plan, nickname: 'Complimentary'},
            tier: {...makeSub().tier, expiry_at: '2026-12-31T12:00:00.000Z'}
        }))).toBe('Expires 31 Dec 2026');
    });

    it('is empty for a complimentary sub with no tier expiry (matches Ember "forever" comp)', () => {
        expect(getSubscriptionValidityLabel(makeSub({
            id: '',
            plan: {...makeSub().plan, nickname: 'Complimentary'}
        }))).toBe('');
    });

    it('renders "Expires <date>" for a gift subscription', () => {
        expect(getSubscriptionValidityLabel(makeSub({
            id: '',
            plan: {...makeSub().plan, nickname: 'Gift Subscription'},
            tier: {...makeSub().tier, expiry_at: '2026-06-30T12:00:00.000Z'}
        }))).toBe('Expires 30 Jun 2026');
    });

    it('renders "Ends <date>" for a paid trial', () => {
        const future = new Date();
        future.setDate(future.getDate() + 7);
        expect(getSubscriptionValidityLabel(makeSub({
            trial_end_at: future.toISOString()
        }))).toContain('Ends ');
    });

    it('prefers cancel copy over trial copy — matches Ember validityDetails order', () => {
        // A canceled trial keeps its cancel copy; Ember's validityDetails checks
        // hasEnded/willEndSoon before trialUntil, so we do too.
        const future = new Date();
        future.setDate(future.getDate() + 7);
        const sub = makeSub({
            status: 'canceled',
            cancel_at_period_end: true,
            trial_end_at: future.toISOString()
        });
        expect(getSubscriptionValidityLabel(sub)).toBe('Ended 1 Feb 2026');
    });
});

describe('getSubscriptionPriceLabel', () => {
    it('is null for a normal paid subscription (Monthly nickname)', () => {
        expect(getSubscriptionPriceLabel(makeSub())).toBeNull();
    });

    it('is null for a Yearly-nickname paid subscription', () => {
        expect(getSubscriptionPriceLabel(makeSub({
            price: {...makeSub().price, nickname: 'Yearly', interval: 'year'}
        }))).toBeNull();
    });

    it('is "Free trial" while a paid subscription still has a future trial_end_at', () => {
        const future = new Date();
        future.setDate(future.getDate() + 7);
        expect(getSubscriptionPriceLabel(makeSub({trial_end_at: future.toISOString()}))).toBe('Free trial');
    });

    it('is the custom nickname for a comp (Ember surfaces "Complimentary" this way)', () => {
        expect(getSubscriptionPriceLabel(makeSub({
            id: '',
            price: {...makeSub().price, nickname: 'Complimentary'}
        }))).toBe('Complimentary');
    });

    it('is the custom nickname for a gift', () => {
        expect(getSubscriptionPriceLabel(makeSub({
            id: '',
            price: {...makeSub().price, nickname: 'Gift Subscription'}
        }))).toBe('Gift Subscription');
    });
});

describe('groupSubscriptionsByTier', () => {
    it('groups subscriptions by tier id, preserving order within a tier', () => {
        const bronze1 = makeSub({id: 'sub_a', tier: {...makeSub().tier, id: 'tier_bronze', name: 'Bronze', slug: 'bronze', active: true, type: 'paid'}});
        const gold = makeSub({id: 'sub_b', tier: {...makeSub().tier, id: 'tier_gold', name: 'Gold', slug: 'gold', active: true, type: 'paid'}});
        const bronze2 = makeSub({id: 'sub_c', tier: {...makeSub().tier, id: 'tier_bronze', name: 'Bronze', slug: 'bronze', active: true, type: 'paid'}});

        const groups = groupSubscriptionsByTier([bronze1, gold, bronze2]);

        expect(groups).toHaveLength(2);
        expect(groups[0].tier.name).toBe('Bronze');
        expect(groups[0].subscriptions.map(s => s.id)).toEqual(['sub_a', 'sub_c']);
        expect(groups[1].tier.name).toBe('Gold');
        expect(groups[1].subscriptions.map(s => s.id)).toEqual(['sub_b']);
    });

    it('skips subscriptions without a tier defensively', () => {
        // The type says `tier` is present, but the server has been observed to omit
        // it in edge cases (`gh-member-settings-form.js:57` explicitly falls back).
        const good = makeSub();
        const bad = makeSub({id: 'sub_bad', tier: undefined as unknown as MemberSubscription['tier']});
        expect(groupSubscriptionsByTier([good, bad])).toHaveLength(1);
    });

    it('skips subscriptions without a price to avoid a row-render crash', () => {
        // Ember explicitly filters `subs.filter(sub => !!sub.price)` before
        // rendering (`gh-member-settings-form.js:63`); we mirror that here.
        const good = makeSub();
        const bad = makeSub({id: 'sub_no_price', price: undefined as unknown as MemberSubscription['price']});
        expect(groupSubscriptionsByTier([good, bad])).toHaveLength(1);
    });
});
