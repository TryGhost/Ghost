import {describe, expect, it} from 'vitest';
import {getDeleteMemberButtonLabel, hasCancelableStripeSubscription} from './member-delete';
import type {MemberSubscription} from '@tryghost/admin-x-framework/api/members';

// Ember's `delete-member.js:22` allows the "Also cancel subscription in Stripe"
// checkbox when the member has ANY subscription whose status is in this set —
// even comp/gift entries (their sub.id is empty and the server call becomes a
// no-op, but Ember doesn't gate the checkbox on classification, so we don't
// either). Anything outside the set (e.g. `incomplete`, `canceled`, `paused`)
// hides the checkbox.
const ALLOWED = ['active', 'trialing', 'unpaid', 'past_due'];
const DISALLOWED = ['incomplete', 'incomplete_expired', 'canceled', 'paused'];

function makeSub(status: string): MemberSubscription {
    return {
        id: 'sub_x',
        customer: {id: 'cus_x', name: null, email: 'x@x.co'},
        plan: {id: 'plan_x', nickname: 'Monthly', interval: 'month', currency: 'usd', amount: 500},
        status,
        start_date: '2026-01-01T00:00:00.000Z',
        current_period_end: '2026-02-01T00:00:00.000Z',
        cancel_at_period_end: false,
        price: {id: 'price_x', price_id: 'price_x', nickname: 'Monthly', amount: 500, currency: 'usd', type: 'recurring', interval: 'month'},
        tier: {id: 'tier_x', name: 'Gold', slug: 'gold', active: true, type: 'paid'},
        offer: null
    };
}

describe('hasCancelableStripeSubscription', () => {
    it('returns false when the member has no subscriptions', () => {
        expect(hasCancelableStripeSubscription({subscriptions: []})).toBe(false);
        expect(hasCancelableStripeSubscription({subscriptions: undefined})).toBe(false);
        expect(hasCancelableStripeSubscription({})).toBe(false);
    });

    it.each(ALLOWED)('returns true for status %s (Ember allow-list)', (status) => {
        expect(hasCancelableStripeSubscription({subscriptions: [makeSub(status)]})).toBe(true);
    });

    it.each(DISALLOWED)('returns false for status %s', (status) => {
        expect(hasCancelableStripeSubscription({subscriptions: [makeSub(status)]})).toBe(false);
    });

    it('returns true if ANY subscription in the list is cancelable', () => {
        expect(hasCancelableStripeSubscription({
            subscriptions: [makeSub('canceled'), makeSub('active')]
        })).toBe(true);
    });
});

describe('getDeleteMemberButtonLabel', () => {
    it('returns the plain label when the cancel-Stripe box is unchecked', () => {
        expect(getDeleteMemberButtonLabel(false)).toBe('Delete member');
    });

    it('returns the combined label when the cancel-Stripe box is checked', () => {
        // Matches Ember `delete-member.hbs:44` — a subtle contract that hides the
        // "actually two operations" nature of the flow behind a single button.
        expect(getDeleteMemberButtonLabel(true)).toBe('Delete member + Cancel subscription');
    });
});
