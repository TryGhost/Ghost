import {commentFields} from '../comments/comment-fields';
import {describe, expect, it} from 'vitest';
import {memberFields} from '../members/member-fields';
import {parseBrowserFilters, replaceBrowserFiltersInSearchParams} from './browser-filter-params';
import type {Filter} from '@tryghost/shade';

describe('browser-filter-params', () => {
    it('parses ordered repeated member filters from named params', () => {
        const params = new URLSearchParams('label=is-any:[vip,alpha]&label=is-not-any:[test]&status=is:paid');

        expect(parseBrowserFilters(params, memberFields)).toEqual<Filter[]>([
            {
                id: 'label:1',
                field: 'label',
                operator: 'is-any',
                values: ['vip', 'alpha']
            },
            {
                id: 'label:2',
                field: 'label',
                operator: 'is-not-any',
                values: ['test']
            },
            {
                id: 'status:1',
                field: 'status',
                operator: 'is',
                values: ['paid']
            }
        ]);
    });

    it('parses dynamic field keys and number values', () => {
        const memberParams = new URLSearchParams('newsletters.weekly=is:subscribed&email_count=is-greater:5');
        const commentParams = new URLSearchParams('reported=is:true&member_id=is:abc123');

        expect(parseBrowserFilters(memberParams, memberFields)).toEqual<Filter[]>([
            {
                id: 'newsletters.weekly:1',
                field: 'newsletters.weekly',
                operator: 'is',
                values: ['subscribed']
            },
            {
                id: 'email_count:1',
                field: 'email_count',
                operator: 'is-greater',
                values: [5]
            }
        ]);

        expect(parseBrowserFilters(commentParams, commentFields)).toEqual<Filter[]>([
            {
                id: 'reported:1',
                field: 'reported',
                operator: 'is',
                values: ['true']
            }
        ]);
    });

    it('skips unknown, alias, or malformed filter params', () => {
        const params = new URLSearchParams('unknown=is:value&member_id=is:abc123&label=is-any:vip&tier_id=is-any:[vip,,alpha]&email_count=is:NaN&status=is:paid');

        expect(parseBrowserFilters(params, memberFields)).toEqual<Filter[]>([
            {
                id: 'status:1',
                field: 'status',
                operator: 'is',
                values: ['paid']
            }
        ]);
    });

    it('drops multiselect filters with ambiguous browser values when serializing', () => {
        const currentParams = new URLSearchParams('search=jane');
        const filters: Filter[] = [
            {
                id: 'label:1',
                field: 'label',
                operator: 'is-any',
                values: ['vip,alpha']
            },
            {
                id: 'status:1',
                field: 'status',
                operator: 'is',
                values: ['paid']
            }
        ];

        expect(replaceBrowserFiltersInSearchParams(currentParams, filters, memberFields).toString()).toBe(
            'search=jane&status=is%3Apaid'
        );
    });

    it('replaces only known filter params when serializing', () => {
        const currentParams = new URLSearchParams('search=jane&thread=comment_123&status=is:free');
        const filters: Filter[] = [
            {
                id: 'status:1',
                field: 'status',
                operator: 'is',
                values: ['paid']
            },
            {
                id: 'label:1',
                field: 'label',
                operator: 'is-any',
                values: ['vip', 'alpha']
            },
            {
                id: 'newsletters.weekly:1',
                field: 'newsletters.weekly',
                operator: 'is',
                values: ['subscribed']
            }
        ];

        expect(replaceBrowserFiltersInSearchParams(currentParams, filters, memberFields).toString()).toBe(
            'search=jane&thread=comment_123&status=is%3Apaid&label=is-any%3A%5Bvip%2Calpha%5D&newsletters.weekly=is%3Asubscribed'
        );
    });
});
