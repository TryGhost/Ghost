import {describe, expect, it} from 'vitest';
import {buildMemberNqlFilter} from '@src/views/members/hooks/use-members-filter-state';
import type {Filter} from '@tryghost/shade';

describe('members nql compatibility', () => {
    it('serializes subscribed=is:subscribed to ember-compatible nql', () => {
        const filters: Filter[] = [
            {
                id: 'subscribed-1',
                field: 'subscribed',
                operator: 'is',
                values: ['subscribed']
            }
        ];

        expect(buildMemberNqlFilter(filters)).toBe('(subscribed:true+email_disabled:0)');
    });

    it('serializes created_at is-or-less with ember day-end boundary', () => {
        const filters: Filter[] = [
            {
                id: 'created-at-1',
                field: 'created_at',
                operator: 'is-or-less',
                values: ['2022-02-01']
            }
        ];

        expect(buildMemberNqlFilter(filters)).toBe('created_at:<=\'2022-02-01 23:59:59\'');
    });

    it('serializes created_at is-or-greater with ember timezone-adjusted UTC boundary', () => {
        const filters: Filter[] = [
            {
                id: 'created-at-2',
                field: 'created_at',
                operator: 'is-or-greater',
                values: ['2022-02-22']
            }
        ];

        expect(buildMemberNqlFilter(filters, {timezone: 'America/New_York'})).toBe('created_at:>=\'2022-02-22 05:00:00\'');
    });

    it('serializes newsletters.<slug> is-not:unsubscribed using ember inverse semantics', () => {
        const filters: Filter[] = [
            {
                id: 'newsletter-1',
                field: 'newsletters.weekly-digest',
                operator: 'is-not',
                values: ['unsubscribed']
            }
        ];

        expect(buildMemberNqlFilter(filters)).toBe('(newsletters.slug:weekly-digest+email_disabled:0)');
    });

    it('serializes subscribed=is-not:unsubscribed to ember-compatible nql', () => {
        const filters: Filter[] = [
            {
                id: 'subscribed-2',
                field: 'subscribed',
                operator: 'is-not',
                values: ['unsubscribed']
            }
        ];

        expect(buildMemberNqlFilter(filters)).toBe('(subscribed:true,email_disabled:1)');
    });

    it('serializes name starts-with with ember-compatible regex prefix operator', () => {
        const filters: Filter[] = [
            {
                id: 'name-1',
                field: 'name',
                operator: 'starts-with',
                values: ['tset']
            }
        ];

        expect(buildMemberNqlFilter(filters)).toBe('name:~^\'tset\'');
    });

    it('escapes apostrophes in text filters like Ember does', () => {
        const filters: Filter[] = [
            {
                id: 'name-2',
                field: 'name',
                operator: 'contains',
                values: ['O\'Nolan']
            }
        ];

        expect(buildMemberNqlFilter(filters)).toBe('name:~\'O\\\'Nolan\'');
    });

    it('serializes label is-not with array syntax matching Ember', () => {
        const filters: Filter[] = [
            {
                id: 'label-1',
                field: 'label',
                operator: 'is-not',
                values: ['vip', 'internal']
            }
        ];

        expect(buildMemberNqlFilter(filters)).toBe('label:-[vip,internal]');
    });

    it('serializes subscriptions.start_date is-greater with ember day-end boundary', () => {
        const filters: Filter[] = [
            {
                id: 'sub-start-1',
                field: 'subscriptions.start_date',
                operator: 'is-greater',
                values: ['2022-02-03']
            }
        ];

        expect(buildMemberNqlFilter(filters)).toBe('subscriptions.start_date:>\'2022-02-03 23:59:59\'');
    });

    it('serializes status is_not using Ember-compatible negation', () => {
        const filters: Filter[] = [
            {
                id: 'status-1',
                field: 'status',
                operator: 'is_not',
                values: ['free']
            }
        ];

        expect(buildMemberNqlFilter(filters)).toBe('status:-free');
    });

    it('serializes newsletters field value format with Ember inverse semantics', () => {
        const filters: Filter[] = [
            {
                id: 'newsletter-2',
                field: 'newsletters',
                operator: 'is-not',
                values: ['weekly-digest:unsubscribed']
            }
        ];

        expect(buildMemberNqlFilter(filters)).toBe('(newsletters.slug:weekly-digest+email_disabled:0)');
    });

    it('serializes email does-not-contain with Ember regex negation operator', () => {
        const filters: Filter[] = [
            {
                id: 'email-1',
                field: 'email',
                operator: 'does-not-contain',
                values: ['.com']
            }
        ];

        expect(buildMemberNqlFilter(filters)).toBe('email:-~\'.com\'');
    });

    it('serializes name not_contains alias with Ember-compatible negation', () => {
        const filters: Filter[] = [
            {
                id: 'name-3',
                field: 'name',
                operator: 'not_contains',
                values: ['2']
            }
        ];

        expect(buildMemberNqlFilter(filters)).toBe('name:-~\'2\'');
    });

    it('serializes newsletter_feedback to Ember custom feedback filter syntax', () => {
        const filters: Filter[] = [
            {
                id: 'feedback-1',
                field: 'newsletter_feedback',
                operator: '1',
                values: ['post_123']
            }
        ];

        expect(buildMemberNqlFilter(filters)).toBe('(feedback.post_id:\'post_123\'+feedback.score:1)');
    });
});
