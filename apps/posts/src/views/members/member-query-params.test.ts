import {
    buildMemberListSearchParams,
    buildMemberOperationParams,
    getActiveColumnValue,
    getMemberActiveColumns
} from './member-query-params';
import {describe, expect, it} from 'vitest';
import type {FilterPredicate} from '../filters/filter-types';
import type {Member} from '@tryghost/admin-x-framework/api/members';

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

describe('getActiveColumnValue', () => {
    const baseMember: Member = {
        id: '1',
        transient_id: 't1',
        uuid: 'u1',
        status: 'paid',
        subscribed: true,
        last_seen_at: null,
        last_commented_at: null,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
    };

    const makeSub = (id: string, status: string) => ({
        id,
        status,
        customer: {id: 'cust_1', name: null, email: 'test@test.com'},
        plan: {id: 'plan_1', nickname: '', interval: 'month' as const, currency: 'usd', amount: 500},
        start_date: '2024-01-01T00:00:00.000Z',
        current_period_end: '2024-02-01T00:00:00.000Z',
        cancel_at_period_end: false,
        price: {id: 'price_1', price_id: 'price_1', nickname: '', amount: 500, currency: 'usd', type: 'recurring', interval: 'month' as const},
        tier: {id: 'tier_1', name: 'Default', slug: 'default', active: true, type: 'paid' as const},
        offer: null
    });

    const statusColumn = {key: 'subscriptions.status', label: 'Subscription status', include: 'subscriptions'};

    it('shows all unique subscription statuses for a member', () => {
        const member = {
            ...baseMember,
            subscriptions: [
                makeSub('sub_1', 'active'),
                makeSub('sub_2', 'canceled')
            ]
        };

        expect(getActiveColumnValue(statusColumn, member, 'UTC')).toEqual({
            text: 'Active, Canceled'
        });
    });

    it('deduplicates subscription statuses', () => {
        const member = {
            ...baseMember,
            subscriptions: [
                makeSub('sub_1', 'canceled'),
                makeSub('sub_2', 'canceled')
            ]
        };

        expect(getActiveColumnValue(statusColumn, member, 'UTC')).toEqual({
            text: 'Canceled'
        });
    });

    it('formats multi-word statuses correctly', () => {
        const member = {
            ...baseMember,
            subscriptions: [
                makeSub('sub_1', 'past_due'),
                makeSub('sub_2', 'incomplete_expired')
            ]
        };

        expect(getActiveColumnValue(statusColumn, member, 'UTC')).toEqual({
            text: 'Past Due, Incomplete - Expired'
        });
    });

    it('sorts statuses by severity (active states first)', () => {
        const member = {
            ...baseMember,
            subscriptions: [
                makeSub('sub_1', 'canceled'),
                makeSub('sub_2', 'active'),
                makeSub('sub_3', 'past_due')
            ]
        };

        expect(getActiveColumnValue(statusColumn, member, 'UTC')).toEqual({
            text: 'Active, Past Due, Canceled'
        });
    });

    it('returns null when member has no subscriptions', () => {
        expect(getActiveColumnValue(statusColumn, baseMember, 'UTC')).toBeNull();
    });

    it('returns null when subscriptions have no id', () => {
        const member = {
            ...baseMember,
            subscriptions: [{...makeSub('', 'active'), id: ''}]
        };

        expect(getActiveColumnValue(statusColumn, member, 'UTC')).toBeNull();
    });
});
