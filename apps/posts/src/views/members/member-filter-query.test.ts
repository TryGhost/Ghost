import {describe, expect, it} from 'vitest';
import {parseMemberFilter, serializeMemberFilters} from './member-filter-query';
import type {FilterPredicate} from '../filters/filter-types';

function stripIds(predicates: FilterPredicate[]) {
    return predicates.map(predicate => ({
        field: predicate.field,
        operator: predicate.operator,
        values: predicate.values
    }));
}

describe('member-filter-query', () => {
    it('parses subscribed lifecycle compounds and legacy email-disabled filters', () => {
        expect(stripIds(parseMemberFilter('(subscribed:true+email_disabled:0)', 'UTC'))).toEqual([
            {field: 'subscribed', operator: 'is', values: ['subscribed']}
        ]);

        expect(stripIds(parseMemberFilter('(subscribed:false,email_disabled:1)', 'UTC'))).toEqual([
            {field: 'subscribed', operator: 'is-not', values: ['subscribed']}
        ]);

        expect(stripIds(parseMemberFilter('(email_disabled:0)', 'UTC'))).toEqual([
            {field: 'subscribed', operator: 'is-not', values: ['email-disabled']}
        ]);
    });

    it('parses newsletter and feedback compounds', () => {
        expect(stripIds(parseMemberFilter('(newsletters.slug:weekly+email_disabled:0)', 'UTC'))).toEqual([
            {field: 'newsletters.weekly', operator: 'is', values: ['subscribed']}
        ]);

        expect(stripIds(parseMemberFilter('(feedback.post_id:\'post_123\'+feedback.score:1)', 'UTC'))).toEqual([
            {field: 'newsletter_feedback', operator: '1', values: ['post_123']}
        ]);
    });

    it('parses legacy scalar set filters and preserves singleton offer ids', () => {
        const parsed = parseMemberFilter('offer_redemptions:\'offer_123\'', 'UTC');

        expect(stripIds(parsed)).toEqual([
            {field: 'offer_redemptions', operator: 'is-any', values: ['offer_123']}
        ]);

        expect(serializeMemberFilters(parsed, 'UTC')).toBe('offer_redemptions:\'offer_123\'');
    });

    it('parses legacy scalar label filters into set predicates', () => {
        expect(stripIds(parseMemberFilter('label:vip', 'UTC'))).toEqual([
            {field: 'label', operator: 'is-any', values: ['vip']}
        ]);
    });

    it('best-effort parses compat subscribed booleans into subscribed filters', () => {
        expect(stripIds(parseMemberFilter('subscribed:true', 'UTC'))).toEqual([
            {field: 'subscribed', operator: 'is', values: ['subscribed']}
        ]);

        expect(stripIds(parseMemberFilter('subscribed:false', 'UTC'))).toEqual([
            {field: 'subscribed', operator: 'is', values: ['unsubscribed']}
        ]);
    });

    it('parses unwrapped Ember compounds at the root', () => {
        expect(stripIds(parseMemberFilter('subscribed:true+email_disabled:0', 'UTC'))).toEqual([
            {field: 'subscribed', operator: 'is', values: ['subscribed']}
        ]);

        expect(stripIds(parseMemberFilter('newsletters.slug:weekly+email_disabled:0', 'UTC'))).toEqual([
            {field: 'newsletters.weekly', operator: 'is', values: ['subscribed']}
        ]);

        expect(stripIds(parseMemberFilter('feedback.post_id:\'post_123\'+feedback.score:1', 'UTC'))).toEqual([
            {field: 'newsletter_feedback', operator: '1', values: ['post_123']}
        ]);
    });

    it('serializes canonical Ember member filters', () => {
        const predicates: FilterPredicate[] = [
            {id: '2', field: 'status', operator: 'is', values: ['paid']},
            {id: '1', field: 'emails.post_id', operator: 'is', values: ['post_123']},
            {id: '3', field: 'newsletters.weekly', operator: 'is', values: ['subscribed']}
        ];

        expect(serializeMemberFilters(predicates, 'UTC')).toBe(
            '(newsletters.slug:weekly+email_disabled:0)+emails.post_id:\'post_123\'+status:paid'
        );
    });

    it('canonicalizes compat subscribed booleans to member filter compounds', () => {
        const parsed = parseMemberFilter('subscribed:true', 'UTC');

        expect(serializeMemberFilters(parsed, 'UTC')).toBe('(subscribed:true+email_disabled:0)');
    });

    it('parses and serializes member date boundaries', () => {
        const parsed = parseMemberFilter('created_at:<=\'2024-01-01T23:59:59.999Z\'', 'UTC');

        expect(stripIds(parsed)).toEqual([
            {field: 'created_at', operator: 'is-or-less', values: ['2024-01-01']}
        ]);

        expect(serializeMemberFilters(parsed, 'UTC')).toBe('created_at:<=\'2024-01-01T23:59:59.999Z\'');
    });

    it('parses legacy Ember member date URLs without ISO timezone markers', () => {
        const parsed = parseMemberFilter('subscriptions.start_date:<=\'2022-02-01 23:59:59\'', 'UTC');

        expect(stripIds(parsed)).toEqual([
            {field: 'subscriptions.start_date', operator: 'is-or-less', values: ['2022-02-01']}
        ]);
    });

    it('parses legacy Ember UTC date URLs relative to the site timezone', () => {
        const parsed = parseMemberFilter('subscriptions.start_date:<=\'2022-02-01 23:59:59\'', 'Europe/Stockholm');

        expect(stripIds(parsed)).toEqual([
            {field: 'subscriptions.start_date', operator: 'is-or-less', values: ['2022-02-02']}
        ]);
    });

    it('round-trips member date boundaries in site timezones', () => {
        const parsed = parseMemberFilter('created_at:<=\'2024-02-01T22:59:59.999Z\'', 'Europe/Stockholm');

        expect(stripIds(parsed)).toEqual([
            {field: 'created_at', operator: 'is-or-less', values: ['2024-02-01']}
        ]);

        expect(serializeMemberFilters(parsed, 'Europe/Stockholm')).toBe('created_at:<=\'2024-02-01T22:59:59.999Z\'');
    });

    it('sorts clauses canonically on serialize', () => {
        const predicates: FilterPredicate[] = [
            {id: '2', field: 'status', operator: 'is', values: ['paid']},
            {id: '1', field: 'label', operator: 'is-any', values: ['vip', 'alpha']}
        ];

        expect(serializeMemberFilters(predicates, 'UTC')).toBe('label:[alpha,vip]+status:paid');
    });

    it('round-trips canonical member examples', () => {
        const filter = '(feedback.post_id:\'post_123\'+feedback.score:1)+status:paid+subscriptions.current_period_end:<=\'2024-01-01T23:59:59.999Z\'';
        const parsed = parseMemberFilter(filter, 'UTC');

        expect(serializeMemberFilters(parsed, 'UTC')).toBe(
            '(feedback.post_id:\'post_123\'+feedback.score:1)+status:paid+subscriptions.current_period_end:<=\'2024-01-01T23:59:59.999Z\''
        );
    });

    it('prefers grouped compound parsing over simple node fallback', () => {
        const parsed = parseMemberFilter('(subscribed:false,email_disabled:1)', 'UTC');

        expect(stripIds(parsed)).toEqual([
            {field: 'subscribed', operator: 'is-not', values: ['subscribed']}
        ]);
    });

    it('parses ordered member compounds alongside simple predicates', () => {
        const parsed = parseMemberFilter(
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

    it('drops unsupported OR compounds during parse', () => {
        expect(parseMemberFilter('status:paid,label:vip', 'UTC')).toEqual([]);
    });

    it('keeps supported siblings when unsupported OR compounds are present', () => {
        expect(stripIds(parseMemberFilter(
            '(status:paid,label:vip)+created_at:<=\'2024-02-01T23:59:59.999Z\'',
            'UTC'
        ))).toEqual([
            {field: 'created_at', operator: 'is-or-less', values: ['2024-02-01']}
        ]);
    });

    it('ignores malformed NQL input', () => {
        expect(parseMemberFilter('status:(', 'UTC')).toEqual([]);
    });

    it('drops invalid member date values during parse', () => {
        expect(parseMemberFilter('created_at:<=\'not-a-date\'', 'UTC')).toEqual([]);
    });
});
