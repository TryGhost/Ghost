import {describe, expect, it} from 'vitest';
import {filtersToSearchParams, searchParamsToFilters} from '@src/views/members/hooks/use-members-filter-state';
import type {MemberPredicate} from '@src/views/filters/member-fields';

const simplifyFilters = (params: URLSearchParams) => {
    return searchParamsToFilters(params).map(({field, operator, values}) => ({field, operator, values}));
};

describe('use-members-filter-state URL helpers', () => {
    it('preserves duplicate field predicates through URL roundtrip', () => {
        const filters: MemberPredicate[] = [
            {id: 'status-1', field: 'status', operator: 'is', values: ['paid']},
            {id: 'status-2', field: 'status', operator: 'is_not', values: ['free']}
        ];

        const params = filtersToSearchParams(filters);
        const parsed = searchParamsToFilters(params);

        expect(params.get('filter')).toBe('status:-free+status:paid');
        expect([...params.keys()]).toEqual(['filter']);
        expect(parsed.map(({field, operator, values}) => ({field, operator, values}))).toEqual([
            {field: 'status', operator: 'is-not', values: ['free']},
            {field: 'status', operator: 'is', values: ['paid']}
        ]);
    });

    it.each([
        {
            label: 'subscribed filters',
            filter: '(subscribed:true+email_disabled:0)',
            expected: [{field: 'subscribed', operator: 'is', values: ['subscribed']}]
        },
        {
            label: 'scalar field filters',
            filter: 'status:paid',
            expected: [{field: 'status', operator: 'is', values: ['paid']}]
        },
        {
            label: 'negated scalar field filters',
            filter: 'status:-free',
            expected: [{field: 'status', operator: 'is-not', values: ['free']}]
        },
        {
            label: 'array filters',
            filter: 'label:-[vip,internal]',
            expected: [{field: 'label', operator: 'is_not_any_of', values: ['vip', 'internal']}]
        },
        {
            label: 'text contains filters',
            filter: 'name:~\'hello\'',
            expected: [{field: 'name', operator: 'contains', values: ['hello']}]
        },
        {
            label: 'specific newsletter filters',
            filter: '(newsletters.slug:test-newsletter+email_disabled:0)',
            expected: [{field: 'newsletters.test-newsletter', operator: 'is', values: ['subscribed']}]
        },
        {
            label: 'unsubscribed specific newsletter filters',
            filter: '(newsletters.slug:-test-newsletter,email_disabled:1)',
            expected: [{field: 'newsletters.test-newsletter', operator: 'is-not', values: ['unsubscribed']}]
        },
        {
            label: 'email_disabled:0 filters as is-not email-disabled',
            filter: '(email_disabled:0)',
            expected: [{field: 'subscribed', operator: 'is-not', values: ['email-disabled']}]
        },
        {
            label: 'compound filters',
            filter: 'status:paid+label:[vip]',
            expected: [
                {field: 'status', operator: 'is', values: ['paid']},
                {field: 'label', operator: 'is_any_of', values: ['vip']}
            ]
        },
        {
            label: 'nested subscribed compounds',
            filter: '(subscribed:true+email_disabled:0)+status:paid',
            expected: [
                {field: 'subscribed', operator: 'is', values: ['subscribed']},
                {field: 'status', operator: 'is', values: ['paid']}
            ]
        },
        {
            label: 'date filters',
            filter: 'created_at:<=\'2022-02-01 23:59:59\'',
            expected: [{field: 'created_at', operator: 'is-or-less', values: ['2022-02-01']}]
        }
    ])('parses legacy ember filter query params for $label', ({filter, expected}) => {
        expect(simplifyFilters(new URLSearchParams({filter}))).toEqual(expected);
    });

    it('preserves legacy ember negative offer filters through React URL roundtrip', () => {
        const legacyParams = new URLSearchParams({
            filter: 'offer_redemptions:-[offer_basic,offer_pro]'
        });

        const parsed = searchParamsToFilters(legacyParams);
        const roundtripParams = filtersToSearchParams(parsed);
        const roundtripParsed = searchParamsToFilters(roundtripParams);

        expect(parsed.map(({field, operator, values}) => ({field, operator, values}))).toEqual([
            {field: 'offer_redemptions', operator: 'is-not', values: ['offer_basic', 'offer_pro']}
        ]);

        expect(roundtripParsed.map(({field, operator, values}) => ({field, operator, values}))).toEqual([
            {field: 'offer_redemptions', operator: 'is-not', values: ['offer_basic', 'offer_pro']}
        ]);
    });

    it('preserves legacy ember multi-tier filters through React URL roundtrip', () => {
        const legacyParams = new URLSearchParams({
            filter: 'tier_id:[tier_basic,tier_pro]'
        });

        const parsed = searchParamsToFilters(legacyParams);
        const roundtripParams = filtersToSearchParams(parsed);
        const roundtripParsed = searchParamsToFilters(roundtripParams);

        expect(parsed.map(({field, operator, values}) => ({field, operator, values}))).toEqual([
            {field: 'tier_id', operator: 'is', values: ['tier_basic', 'tier_pro']}
        ]);

        expect(roundtripParsed.map(({field, operator, values}) => ({field, operator, values}))).toEqual([
            {field: 'tier_id', operator: 'is', values: ['tier_basic', 'tier_pro']}
        ]);
    });
    it('ignores the removed React field-param filter format', () => {
        const params = new URLSearchParams({
            status: 'is:paid',
            name: 'contains:alex'
        });

        const parsed = searchParamsToFilters(params);

        expect(parsed).toEqual([]);
    });
});
