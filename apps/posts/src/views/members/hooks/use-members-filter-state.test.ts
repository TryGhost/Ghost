import {describe, expect, it} from 'vitest';
import {buildClearedFilterParams, filtersToSearchParams, searchParamsToFilters} from '@src/views/members/hooks/use-members-filter-state';
import type {Filter} from '@tryghost/shade';

describe('use-members-filter-state URL helpers', () => {
    it('preserves duplicate field predicates through URL roundtrip', () => {
        const filters: Filter[] = [
            {id: 'status-1', field: 'status', operator: 'is', values: ['paid']},
            {id: 'status-2', field: 'status', operator: 'is_not', values: ['free']}
        ];

        const params = filtersToSearchParams(filters);
        const parsed = searchParamsToFilters(params);

        expect(parsed.map(({field, operator, values}) => ({field, operator, values}))).toEqual([
            {field: 'status', operator: 'is', values: ['paid']},
            {field: 'status', operator: 'is_not', values: ['free']}
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
            {field: 'label', operator: 'is-not', values: ['vip', 'internal']}
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

    it('clears picker predicates without clearing search params', () => {
        const params = new URLSearchParams({
            status: 'is:paid',
            search: 'alex'
        });

        expect(buildClearedFilterParams(params).toString()).toBe('search=alex');
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
