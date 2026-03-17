import {describe, expect, it} from 'vitest';
import {importLegacyMemberFilters} from './member-filter-import';
import type {Filter} from '@tryghost/shade';

function stripIds(filters: Filter[]) {
    return filters.map(filter => ({
        field: filter.field,
        operator: filter.operator,
        values: filter.values
    }));
}

describe('member-filter-import', () => {
    it('parses subscribed lifecycle compounds and legacy email-disabled filters', () => {
        expect(stripIds(importLegacyMemberFilters('(subscribed:true+email_disabled:0)', 'UTC'))).toEqual([
            {field: 'subscribed', operator: 'is', values: ['subscribed']}
        ]);

        expect(stripIds(importLegacyMemberFilters('(subscribed:false,email_disabled:1)', 'UTC'))).toEqual([
            {field: 'subscribed', operator: 'is-not', values: ['subscribed']}
        ]);

        expect(stripIds(importLegacyMemberFilters('(email_disabled:0)', 'UTC'))).toEqual([
            {field: 'subscribed', operator: 'is-not', values: ['email-disabled']}
        ]);
    });

    it('parses newsletter and feedback compounds', () => {
        expect(stripIds(importLegacyMemberFilters('(newsletters.slug:weekly+email_disabled:0)', 'UTC'))).toEqual([
            {field: 'newsletters.weekly', operator: 'is', values: ['subscribed']}
        ]);

        expect(stripIds(importLegacyMemberFilters('(newsletters.slug:-weekly,email_disabled:1)', 'UTC'))).toEqual([
            {field: 'newsletters.weekly', operator: 'is', values: ['unsubscribed']}
        ]);

        expect(stripIds(importLegacyMemberFilters('(feedback.post_id:\'post_123\'+feedback.score:1)', 'UTC'))).toEqual([
            {field: 'newsletter_feedback', operator: '1', values: ['post_123']}
        ]);
    });

    it('parses unwrapped Ember compounds at the root', () => {
        expect(stripIds(importLegacyMemberFilters('subscribed:true+email_disabled:0', 'UTC'))).toEqual([
            {field: 'subscribed', operator: 'is', values: ['subscribed']}
        ]);

        expect(stripIds(importLegacyMemberFilters('newsletters.slug:weekly+email_disabled:0', 'UTC'))).toEqual([
            {field: 'newsletters.weekly', operator: 'is', values: ['subscribed']}
        ]);

        expect(stripIds(importLegacyMemberFilters('feedback.post_id:\'post_123\'+feedback.score:1', 'UTC'))).toEqual([
            {field: 'newsletter_feedback', operator: '1', values: ['post_123']}
        ]);
    });

    it('imports member date boundaries', () => {
        const parsed = importLegacyMemberFilters('created_at:<=\'2024-01-01T23:59:59.999Z\'', 'UTC');

        expect(stripIds(parsed)).toEqual([
            {field: 'created_at', operator: 'is-or-less', values: ['2024-01-01']}
        ]);
    });

    it('imports member date boundaries in site timezones', () => {
        const parsed = importLegacyMemberFilters('created_at:<=\'2024-02-01T22:59:59.999Z\'', 'Europe/Stockholm');

        expect(stripIds(parsed)).toEqual([
            {field: 'created_at', operator: 'is-or-less', values: ['2024-02-01']}
        ]);
    });

    it('imports ordered member compounds alongside simple predicates', () => {
        const parsed = importLegacyMemberFilters(
            '(subscribed:true+email_disabled:0)+(newsletters.slug:weekly+email_disabled:0)+(feedback.post_id:\'post_123\'+feedback.score:1)+status:paid',
            'UTC'
        );

        expect(stripIds(parsed)).toEqual([
            {field: 'subscribed', operator: 'is', values: ['subscribed']},
            {field: 'newsletters.weekly', operator: 'is', values: ['subscribed']},
            {field: 'newsletter_feedback', operator: '1', values: ['post_123']},
            {field: 'status', operator: 'is', values: ['paid']}
        ]);
    });

    it('ignores malformed NQL input', () => {
        expect(importLegacyMemberFilters('status:(', 'UTC')).toEqual([]);
    });

    it('drops invalid member date values during import', () => {
        expect(importLegacyMemberFilters('created_at:<=\'not-a-date\'', 'UTC')).toEqual([]);
    });

    it('matches Ember fallback behavior for reordered compound children', () => {
        expect(stripIds(importLegacyMemberFilters('(email_disabled:0+subscribed:true)', 'UTC'))).toEqual([
            {field: 'subscribed', operator: 'is-not', values: ['email-disabled']}
        ]);

        expect(importLegacyMemberFilters('(feedback.score:1+feedback.post_id:\'post_123\')', 'UTC')).toEqual([]);
    });
});
