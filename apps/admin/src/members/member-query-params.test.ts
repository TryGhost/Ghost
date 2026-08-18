import {
    buildMemberListSearchParams,
    buildMemberOperationParams,
    getMemberActiveColumns
} from './member-query-params';
import {describe, expect, it} from 'vitest';
import type {FilterPredicate} from '@/shared/filters';
import type {MemberActiveColumnOptions} from './member-query-params';
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

/**
 * The column a filter on this field earns, read the way the list reads it: a column is only
 * ever reached through the filter that raised it, so a test that hand-wrote one could pass
 * against a column the app can no longer produce.
 */
const columnFor = (field: string, options?: MemberActiveColumnOptions) => {
    const filters: FilterPredicate[] = [{id: '1', field, operator: 'is', values: ['x']}];
    return getMemberActiveColumns(filters, options)[0];
};

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

        expect(getMemberActiveColumns(filters).map(({key, label}) => ({key, label}))).toEqual([
            {
                key: 'labels',
                label: 'Labels'
            },
            {
                key: 'subscriptions.current_period_end',
                label: 'Next billing date'
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

describe('a subscription column reads the resolved current_subscription', () => {
    const activeMonthly = sub({id: 'a', status: 'active', plan: {id: 'p', nickname: 'M', interval: 'month', currency: 'usd', amount: 1000}});
    const cancelledYearly = sub({id: 'c', status: 'canceled', plan: {id: 'p', nickname: 'Y', interval: 'year', currency: 'usd', amount: 10000}});

    it('reads status and plan from current_subscription', () => {
        const m = member({current_subscription: activeMonthly, subscriptions: [activeMonthly, cancelledYearly]});
        expect(columnFor('subscriptions.status').getValue(m, 'UTC')?.text).toBe('Active');
        expect(columnFor('subscriptions.plan_interval').getValue(m, 'UTC')?.text).toBe('Monthly');
    });

    it('returns null when the member has no current subscription', () => {
        const m = member({current_subscription: null, subscriptions: [cancelledYearly]});
        expect(columnFor('subscriptions.status').getValue(m, 'UTC')).toBeNull();
    });

    it('returns null when the field is absent', () => {
        const m = member({subscriptions: [cancelledYearly]});
        expect(columnFor('subscriptions.status').getValue(m, 'UTC')).toBeNull();
    });
});

describe('custom field columns', () => {
    const customFields = [
        {key: 'job_title', name: 'Job title', type: 'short_text' as const},
        {key: 'shipping_address', name: 'Shipping address', type: 'address' as const}
    ];

    const filterOn = (key: string): FilterPredicate[] => [
        {id: '1', field: `custom_fields.${key}`, operator: 'contains', values: ['x']}
    ];

    it('names one column per field filtered on, from the field itself', () => {
        expect(getMemberActiveColumns(filterOn('job_title'), {customFields}).map(({key, label}) => ({key, label})))
            .toEqual([{key: 'custom_fields.job_title', label: 'Job title'}]);
    });

    // The template resolves to one shared definition for every custom field, so two
    // filters must still produce two distinct columns rather than collapsing into one.
    it('gives two filtered fields a column each', () => {
        const filters = [...filterOn('job_title'), ...filterOn('shipping_address')];

        expect(getMemberActiveColumns(filters, {customFields}).map(column => column.key))
            .toEqual(['custom_fields.job_title', 'custom_fields.shipping_address']);
    });

    // No names supplied is what the flag being off looks like from here, and what the
    // moment before the fetch lands looks like too.
    it('adds no column when the field cannot be named', () => {
        expect(getMemberActiveColumns(filterOn('job_title'))).toEqual([]);
        expect(getMemberActiveColumns(filterOn('nonexistent'), {customFields})).toEqual([]);
    });

    // Naming the column waits on the fetch; asking for the values must not, or the list
    // fetches once without them and again once the names land.
    it('asks for values as soon as a custom field is filtered on, named or not', () => {
        expect(buildMemberListSearchParams({filters: filterOn('job_title'), nql: 'x', search: ''})?.include)
            .toBe('labels,tiers,custom_fields');
    });

    it('reads a scalar value by key', () => {
        const m = member({custom_fields: {job_title: 'Editor'}});

        expect(columnFor('custom_fields.job_title', {customFields}).getValue(m, 'UTC'))
            .toEqual({text: 'Editor'});
    });

    it('reads a composite value as one line', () => {
        const m = member({custom_fields: {shipping_address: {line1: '1 Main St', city: 'Berlin', postal_code: '10115', country: 'DE'}}});

        expect(columnFor('custom_fields.shipping_address', {customFields}).getValue(m, 'UTC'))
            .toEqual({text: '1 Main St, Berlin, 10115, DE'});
    });

    it('returns null when the member has no value', () => {
        const m = member({custom_fields: {}});

        expect(columnFor('custom_fields.job_title', {customFields}).getValue(m, 'UTC')).toBeNull();
    });
});
