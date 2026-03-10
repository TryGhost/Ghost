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

        expect(buildMemberNqlFilter(filters)).toBe('label:-[internal,vip]');
    });

    it('serializes label is_not_any_of with ember-compatible exclusion syntax', () => {
        const filters: Filter[] = [
            {
                id: 'label-2',
                field: 'label',
                operator: 'is_not_any_of',
                values: ['vip', 'internal']
            }
        ];

        expect(buildMemberNqlFilter(filters)).toBe('label:-[internal,vip]');
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

    it('serializes signup resource filters with quoted IDs like Ember', () => {
        const filters: Filter[] = [
            {
                id: 'signup-1',
                field: 'signup',
                operator: 'is',
                values: ['65f2c3a1']
            }
        ];

        expect(buildMemberNqlFilter(filters)).toBe('signup:\'65f2c3a1\'');
    });

    it('serializes numeric email_open_rate filters as raw numbers like Ember', () => {
        const filters: Filter[] = [
            {
                id: 'open-rate-1',
                field: 'email_open_rate',
                operator: 'is-greater',
                values: [0.5]
            }
        ];

        expect(buildMemberNqlFilter(filters)).toBe('email_open_rate:>0.5');
    });

    it('serializes subscriptions.status with Ember negation mapping', () => {
        const filters: Filter[] = [
            {
                id: 'sub-status-1',
                field: 'subscriptions.status',
                operator: 'is-not',
                values: ['active']
            }
        ];

        expect(buildMemberNqlFilter(filters)).toBe('subscriptions.status:-active');
    });

    it('serializes tier_id arrays with Ember bracket syntax', () => {
        const filters: Filter[] = [
            {
                id: 'tier-1',
                field: 'tier_id',
                operator: 'is',
                values: ['tier_basic', 'tier_pro']
            }
        ];

        expect(buildMemberNqlFilter(filters)).toBe('tier_id:[tier_basic,tier_pro]');
    });

    it('serializes offer_redemptions is-not arrays with Ember bracket negation', () => {
        const filters: Filter[] = [
            {
                id: 'offer-1',
                field: 'offer_redemptions',
                operator: 'is-not',
                values: ['offer_basic', 'offer_pro']
            }
        ];

        expect(buildMemberNqlFilter(filters)).toBe('offer_redemptions:-[offer_basic,offer_pro]');
    });

    it('serializes subscribed=email-disabled with Ember special-case expression', () => {
        const filters: Filter[] = [
            {
                id: 'subscribed-3',
                field: 'subscribed',
                operator: 'is',
                values: ['email-disabled']
            }
        ];

        expect(buildMemberNqlFilter(filters)).toBe('(email_disabled:1)');
    });

    it('serializes multiple predicates using canonical sorted order', () => {
        const filters: Filter[] = [
            {
                id: 'status-2',
                field: 'status',
                operator: 'is',
                values: ['paid']
            },
            {
                id: 'subscribed-4',
                field: 'subscribed',
                operator: 'is',
                values: ['subscribed']
            }
        ];

        expect(buildMemberNqlFilter(filters)).toBe('(subscribed:true+email_disabled:0)+status:paid');
    });
});
