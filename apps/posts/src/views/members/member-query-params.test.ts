import {
    buildMemberListSearchParams,
    buildMemberOperationParams,
    getActiveColumnValue,
    getCurrentSubscription,
    getMemberActiveColumns,
    mostRelevantSubscription
} from './member-query-params';
import {describe, expect, it} from 'vitest';
import type {FilterPredicate} from '../filters/filter-types';
import type {Member, MemberSubscription} from '@tryghost/admin-x-framework/api/members';

const sub = (overrides: Partial<MemberSubscription> = {}): MemberSubscription => ({
    id: 'sub_1',
    status: 'active',
    current_period_end: '2030-01-01T00:00:00.000Z',
    start_date: '2024-01-01T00:00:00.000Z',
    plan: {id: 'plan_1', nickname: 'Monthly', interval: 'month', currency: 'usd', amount: 1000},
    cancel_at_period_end: false,
    cancellation_reason: null,
    customer: {id: 'cust_1', name: 'Test', email: 'test@example.com'},
    price: {id: 'price_1', price_id: 'price_1', currency: 'usd', amount: 1000, nickname: 'Monthly', interval: 'month', type: 'recurring', tier: {id: 't_1', name: 'Tier'}},
    ...overrides
} as MemberSubscription);

const member = (overrides: Partial<Member> = {}): Member => ({
    id: 'm_1',
    email: 'test@example.com',
    name: 'Test',
    status: 'paid',
    subscriptions: [],
    ...overrides
} as Member);

describe('member-query-params', () => {
    it('keeps search separate while deriving includes from active field metadata', () => {
        const filters: FilterPredicate[] = [
            {
                id: '1',
                field: 'subscriptions.status',
                operator: 'is',
                values: ['active']
            },
            {
                id: '2',
                field: 'label',
                operator: 'is-any',
                values: ['vip']
            }
        ];

        expect(buildMemberListSearchParams({
            filters,
            nql: 'label:[vip]+subscriptions.status:active',
            search: 'jamie'
        })).toEqual({
            include: 'labels,tiers,subscriptions',
            limit: '100',
            order: 'created_at desc',
            filter: 'label:[vip]+subscriptions.status:active',
            search: 'jamie'
        });
    });

    it('derives active columns from field metadata without a separate map', () => {
        const filters: FilterPredicate[] = [
            {
                id: '1',
                field: 'label',
                operator: 'is-any',
                values: ['vip']
            },
            {
                id: '2',
                field: 'subscriptions.current_period_end',
                operator: 'is-or-less',
                values: ['2024-01-01']
            }
        ];

        expect(getMemberActiveColumns(filters)).toEqual([
            {
                key: 'labels',
                label: 'Labels',
                include: 'labels'
            },
            {
                key: 'subscriptions.current_period_end',
                label: 'Next billing date',
                include: 'subscriptions'
            }
        ]);
    });

    it('builds member operation params for filtered, searched, and unscoped actions', () => {
        expect(buildMemberOperationParams({
            nql: 'status:paid',
            search: 'jamie'
        })).toEqual({
            filter: 'status:paid',
            search: 'jamie'
        });

        expect(buildMemberOperationParams({
            nql: undefined,
            search: 'jamie'
        })).toEqual({
            search: 'jamie'
        });

        expect(buildMemberOperationParams({
            nql: undefined,
            search: ''
        })).toEqual({
            all: true
        });
    });
});

describe('getCurrentSubscription (fallback for deploy skew)', () => {
    const activeOld = sub({
        id: 'active_old',
        status: 'active',
        current_period_end: '2030-06-01T00:00:00.000Z'
    });
    const cancelledRecent = sub({
        id: 'cancelled_recent',
        status: 'canceled',
        current_period_end: '2031-01-01T00:00:00.000Z'
    });

    it('returns the BE-provided current_subscription when present', () => {
        const m = member({
            current_subscription: activeOld,
            subscriptions: [activeOld, cancelledRecent]
        });
        expect(getCurrentSubscription(m)?.id).toBe('active_old');
    });

    it('returns null when BE explicitly returned null (no resolved sub)', () => {
        const m = member({
            current_subscription: null,
            subscriptions: [cancelledRecent]
        });
        expect(getCurrentSubscription(m)).toBeNull();
    });

    it('falls back to local resolution when BE omits the field (deploy skew)', () => {
        const m = member({subscriptions: [activeOld, cancelledRecent]});
        // current_subscription is undefined, fallback uses mostRelevantSubscription
        expect(getCurrentSubscription(m)?.id).toBe('active_old');
    });

    it('does NOT re-run fallback when BE returned null — that re-introduces the bug', () => {
        // If we used `!= null` instead of `!== undefined`, this would silently
        // recompute and surface a sub the BE deliberately resolved away.
        const m = member({
            current_subscription: null,
            subscriptions: [activeOld, cancelledRecent]
        });
        expect(getCurrentSubscription(m)).toBeNull();
    });
});

describe('mostRelevantSubscription (legacy fallback)', () => {
    it('prefers active over cancelled even when cancelled is more recent', () => {
        const activeOld = sub({id: 'a', status: 'active', current_period_end: '2030-01-01T00:00:00.000Z'});
        const cancelledRecent = sub({id: 'c', status: 'canceled', current_period_end: '2031-01-01T00:00:00.000Z'});
        expect(mostRelevantSubscription([cancelledRecent, activeOld])?.id).toBe('a');
    });

    it('among active subs, picks the one with the latest current_period_end', () => {
        const earlier = sub({id: 'e', status: 'active', current_period_end: '2030-01-01T00:00:00.000Z'});
        const later = sub({id: 'l', status: 'active', current_period_end: '2031-01-01T00:00:00.000Z'});
        expect(mostRelevantSubscription([earlier, later])?.id).toBe('l');
    });

    it('treats trialing/past_due/unpaid as active', () => {
        const trial = sub({id: 't', status: 'trialing', current_period_end: '2030-01-01T00:00:00.000Z'});
        const cancelledRecent = sub({id: 'c', status: 'canceled', current_period_end: '2031-01-01T00:00:00.000Z'});
        expect(mostRelevantSubscription([cancelledRecent, trial])?.id).toBe('t');
    });

    it('returns null for undefined or empty subscriptions', () => {
        expect(mostRelevantSubscription(undefined)).toBeNull();
        expect(mostRelevantSubscription([])).toBeNull();
    });

    it('skips entries without an id', () => {
        const noId = sub({id: undefined as unknown as string, status: 'active'});
        const withId = sub({id: 'real', status: 'canceled'});
        expect(mostRelevantSubscription([noId, withId])?.id).toBe('real');
    });
});

describe('getActiveColumnValue uses getCurrentSubscription (incl. fallback)', () => {
    const activeMonthly = sub({id: 'a', status: 'active', plan: {id: 'p', nickname: 'M', interval: 'month', currency: 'usd', amount: 1000}});
    const cancelledYearly = sub({id: 'c', status: 'canceled', plan: {id: 'p', nickname: 'Y', interval: 'year', currency: 'usd', amount: 10000}});

    it('reads from BE current_subscription when present (active wins)', () => {
        const m = member({current_subscription: activeMonthly, subscriptions: [activeMonthly, cancelledYearly]});
        expect(getActiveColumnValue({key: 'subscriptions.status', label: 'Status'}, m, 'UTC')?.text).toBe('Active');
        expect(getActiveColumnValue({key: 'subscriptions.plan_interval', label: 'Plan'}, m, 'UTC')?.text).toBe('Monthly');
    });

    it('falls back to legacy resolution when BE omits the field', () => {
        // Without current_subscription, fallback runs — should still pick the active sub
        const m = member({subscriptions: [cancelledYearly, activeMonthly]});
        expect(getActiveColumnValue({key: 'subscriptions.status', label: 'Status'}, m, 'UTC')?.text).toBe('Active');
        expect(getActiveColumnValue({key: 'subscriptions.plan_interval', label: 'Plan'}, m, 'UTC')?.text).toBe('Monthly');
    });

    it('returns null status when BE explicitly returned null current_subscription', () => {
        const m = member({current_subscription: null, subscriptions: [cancelledYearly]});
        expect(getActiveColumnValue({key: 'subscriptions.status', label: 'Status'}, m, 'UTC')).toBeNull();
    });
});
