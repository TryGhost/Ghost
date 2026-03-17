import {compileMemberFilters} from './member-filter-query';
import {describe, expect, it} from 'vitest';
import type {Filter} from '@tryghost/shade';

describe('member-filter-query', () => {
    it('compiles canonical Ember member filters', () => {
        const filters: Filter[] = [
            {id: '2', field: 'status', operator: 'is', values: ['paid']},
            {id: '1', field: 'emails.post_id', operator: 'is', values: ['post_123']},
            {id: '3', field: 'newsletters.weekly', operator: 'is', values: ['subscribed']}
        ];

        expect(compileMemberFilters(filters, 'UTC')).toBe(
            '(newsletters.slug:weekly+email_disabled:0)+emails.post_id:\'post_123\'+status:paid'
        );
    });

    it('compiles member date boundaries', () => {
        const filters: Filter[] = [
            {id: '1', field: 'created_at', operator: 'is-or-less', values: ['2024-01-01']}
        ];

        expect(compileMemberFilters(filters, 'UTC')).toBe('created_at:<=\'2024-01-01T23:59:59.999Z\'');
    });

    it('compiles member date boundaries in site timezones', () => {
        const filters: Filter[] = [
            {id: '1', field: 'created_at', operator: 'is-or-less', values: ['2024-02-01']}
        ];

        expect(compileMemberFilters(filters, 'Europe/Stockholm')).toBe('created_at:<=\'2024-02-01T22:59:59.999Z\'');
    });

    it('sorts clauses canonically on serialize', () => {
        const filters: Filter[] = [
            {id: '2', field: 'status', operator: 'is', values: ['paid']},
            {id: '1', field: 'label', operator: 'is-any', values: ['vip', 'alpha']}
        ];

        expect(compileMemberFilters(filters, 'UTC')).toBe('label:[alpha,vip]+status:paid');
    });

    it('compiles canonical member examples', () => {
        const filters: Filter[] = [
            {id: '1', field: 'newsletter_feedback', operator: '1', values: ['post_123']},
            {id: '2', field: 'status', operator: 'is', values: ['paid']},
            {id: '3', field: 'subscriptions.current_period_end', operator: 'is-or-less', values: ['2024-01-01']}
        ];

        expect(compileMemberFilters(filters, 'UTC')).toBe(
            '(feedback.post_id:\'post_123\'+feedback.score:1)+status:paid+subscriptions.current_period_end:<=\'2024-01-01T23:59:59.999Z\''
        );
    });
});
