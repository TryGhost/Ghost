import {describe, expect, it} from 'vitest';
import {filtersToSearchParams, searchParamsToFilters} from '@src/views/members/hooks/use-members-filter-state';
import type {MemberPredicate} from '@src/views/filters/member-fields';

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

    it('parses legacy ember filter query params for subscribed filters', () => {
        const params = new URLSearchParams({
            filter: '(subscribed:true+email_disabled:0)'
        });

        const parsed = searchParamsToFilters(params);

        expect(parsed.map(({field, operator, values}) => ({field, operator, values}))).toEqual([
            {field: 'subscribed', operator: 'is', values: ['subscribed']}
        ]);
    });

    it('parses legacy ember filter query params for scalar field filters', () => {
        const params = new URLSearchParams({
            filter: 'status:paid'
        });

        const parsed = searchParamsToFilters(params);

        expect(parsed.map(({field, operator, values}) => ({field, operator, values}))).toEqual([
            {field: 'status', operator: 'is', values: ['paid']}
        ]);
    });

    it('parses legacy ember filter query params for negated scalar field filters', () => {
        const params = new URLSearchParams({
            filter: 'status:-free'
        });

        const parsed = searchParamsToFilters(params);

        expect(parsed.map(({field, operator, values}) => ({field, operator, values}))).toEqual([
            {field: 'status', operator: 'is-not', values: ['free']}
        ]);
    });

    it('parses legacy ember filter query params for array filters', () => {
        const params = new URLSearchParams({
            filter: 'label:-[vip,internal]'
        });

        const parsed = searchParamsToFilters(params);

        expect(parsed.map(({field, operator, values}) => ({field, operator, values}))).toEqual([
            {field: 'label', operator: 'is_not_any_of', values: ['vip', 'internal']}
        ]);
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

    it('parses legacy ember filter query params for text contains filters', () => {
        const params = new URLSearchParams({
            filter: 'name:~\'hello\''
        });

        const parsed = searchParamsToFilters(params);

        expect(parsed.map(({field, operator, values}) => ({field, operator, values}))).toEqual([
            {field: 'name', operator: 'contains', values: ['hello']}
        ]);
    });

    it('parses legacy ember filter query params for specific newsletter filters', () => {
        const params = new URLSearchParams({
            filter: '(newsletters.slug:test-newsletter+email_disabled:0)'
        });

        const parsed = searchParamsToFilters(params);

        expect(parsed.map(({field, operator, values}) => ({field, operator, values}))).toEqual([
            {field: 'newsletters.test-newsletter', operator: 'is', values: ['subscribed']}
        ]);
    });

    it('parses legacy ember unsubscribed specific newsletter filters', () => {
        const params = new URLSearchParams({
            filter: '(newsletters.slug:-test-newsletter,email_disabled:1)'
        });

        const parsed = searchParamsToFilters(params);

        expect(parsed.map(({field, operator, values}) => ({field, operator, values}))).toEqual([
            {field: 'newsletters.test-newsletter', operator: 'is-not', values: ['unsubscribed']}
        ]);
    });

    it('parses legacy ember email_disabled:0 filters as is-not email-disabled', () => {
        const params = new URLSearchParams({
            filter: '(email_disabled:0)'
        });

        const parsed = searchParamsToFilters(params);

        expect(parsed.map(({field, operator, values}) => ({field, operator, values}))).toEqual([
            {field: 'subscribed', operator: 'is-not', values: ['email-disabled']}
        ]);
    });

    it('parses legacy ember filter query params for compound filters', () => {
        const params = new URLSearchParams({
            filter: 'status:paid+label:[vip]'
        });

        const parsed = searchParamsToFilters(params);

        expect(parsed.map(({field, operator, values}) => ({field, operator, values}))).toEqual([
            {field: 'status', operator: 'is', values: ['paid']},
            {field: 'label', operator: 'is_any_of', values: ['vip']}
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

    it('parses legacy ember filter query params for nested subscribed compounds', () => {
        const params = new URLSearchParams({
            filter: '(subscribed:true+email_disabled:0)+status:paid'
        });

        const parsed = searchParamsToFilters(params);

        expect(parsed.map(({field, operator, values}) => ({field, operator, values}))).toEqual([
            {field: 'subscribed', operator: 'is', values: ['subscribed']},
            {field: 'status', operator: 'is', values: ['paid']}
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

    it('parses legacy ember filter query params for date filters', () => {
        const params = new URLSearchParams({
            filter: 'created_at:<=\'2022-02-01 23:59:59\''
        });

        const parsed = searchParamsToFilters(params);

        expect(parsed.map(({field, operator, values}) => ({field, operator, values}))).toEqual([
            {field: 'created_at', operator: 'is-or-less', values: ['2022-02-01']}
        ]);
    });
});
