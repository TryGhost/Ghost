import {describe, expect, it} from 'vitest';
import {getMemberFields} from './member-fields';
import {hasTimezoneSensitiveMemberFilter, isPredicateEnabled, parseMemberFilter, serializeMemberFilters} from './member-filter-query';
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

    it('parses relative past-date filters into in-the-last predicates for every supported field', () => {
        expect(stripIds(parseMemberFilter('created_at:>=now-7d', 'UTC'))).toEqual([
            {field: 'created_at', operator: 'in-the-last', values: [7]}
        ]);

        expect(stripIds(parseMemberFilter('last_seen_at:>=now-30d', 'UTC'))).toEqual([
            {field: 'last_seen_at', operator: 'in-the-last', values: [30]}
        ]);

        expect(stripIds(parseMemberFilter('subscriptions.start_date:>=now-90d', 'UTC'))).toEqual([
            {field: 'subscriptions.start_date', operator: 'in-the-last', values: [90]}
        ]);
    });

    it('parses relative future-date filters into in-the-next predicates', () => {
        expect(stripIds(parseMemberFilter('subscriptions.current_period_end:<=now+14d', 'UTC'))).toEqual([
            {field: 'subscriptions.current_period_end', operator: 'in-the-next', values: [14]}
        ]);
    });

    it('serializes in-the-last and in-the-next predicates with the relative now token', () => {
        expect(serializeMemberFilters(
            [{id: '1', field: 'created_at', operator: 'in-the-last', values: [7]}],
            'UTC'
        )).toBe('created_at:>=now-7d');

        expect(serializeMemberFilters(
            [{id: '1', field: 'subscriptions.current_period_end', operator: 'in-the-next', values: [14]}],
            'UTC'
        )).toBe('subscriptions.current_period_end:<=now+14d');
    });

    it('round-trips relative created_at predicates alongside other clauses', () => {
        const filter = 'created_at:>=now-30d+status:paid';
        const parsed = parseMemberFilter(filter, 'UTC');

        expect(stripIds(parsed)).toEqual([
            {field: 'created_at', operator: 'in-the-last', values: [30]},
            {field: 'status', operator: 'is', values: ['paid']}
        ]);

        expect(serializeMemberFilters(parsed, 'UTC')).toBe('created_at:>=now-30d+status:paid');
    });

    it('drops invalid relative date predicates on serialize', () => {
        expect(serializeMemberFilters(
            [{id: '1', field: 'created_at', operator: 'in-the-last', values: [0]}],
            'UTC'
        )).toBeUndefined();

        expect(serializeMemberFilters(
            [{id: '1', field: 'created_at', operator: 'in-the-last', values: ['7']}],
            'UTC'
        )).toBeUndefined();
    });

    it('drops the entire filter when a relative-date clause is mixed into a top-level OR', () => {
        // Top-level OR isn't flattened by parseMemberNode, so every clause —
        // including the non-relative `status:paid` — is dropped. Pinned to
        // catch silent regressions if OR support is added later.
        const parsed = parseMemberFilter('created_at:>=now-7d,status:paid', 'UTC');

        expect(stripIds(parsed)).toEqual([]);
    });

    it('drops the degenerate now-0d form', () => {
        // The codec only accepts a relative-day count > 0 — both directions
        // (parse and serialize) defend the same predicate-shape invariant.
        expect(parseMemberFilter('created_at:>=now-0d', 'UTC')).toEqual([]);
    });

    it('rejects relative day counts outside the safe-integer range on parse', () => {
        expect(parseMemberFilter('created_at:>=now-9999999999999999d', 'UTC')).toEqual([]);
    });

    it('reports relative-date filters as timezone-sensitive', () => {
        // `now` resolves in the user's timezone, so a relative-date clause
        // must wait for timezone resolution just like an absolute date clause.
        expect(hasTimezoneSensitiveMemberFilter('created_at:>=now-7d')).toBe(true);
        expect(hasTimezoneSensitiveMemberFilter('subscriptions.current_period_end:<=now+14d')).toBe(true);
        expect(hasTimezoneSensitiveMemberFilter('created_at:>=now-7d+status:paid')).toBe(true);
    });

    it('does not report non-date filters as timezone-sensitive', () => {
        expect(hasTimezoneSensitiveMemberFilter('status:paid')).toBe(false);
        expect(hasTimezoneSensitiveMemberFilter('')).toBe(false);
        expect(hasTimezoneSensitiveMemberFilter(undefined)).toBe(false);
    });
});

describe('isPredicateEnabled', () => {
    const fields = getMemberFields();

    it('returns true for predicates whose operator is declared by the field map', () => {
        expect(isPredicateEnabled(
            {field: 'created_at', operator: 'in-the-last', values: [7]},
            fields
        )).toBe(true);

        expect(isPredicateEnabled(
            {field: 'status', operator: 'is', values: ['paid']},
            fields
        )).toBe(true);
    });

    it('returns false for a relative operator on a field that does not advertise that direction', () => {
        // `subscriptions.current_period_end` is future-only.
        expect(isPredicateEnabled(
            {field: 'subscriptions.current_period_end', operator: 'in-the-last', values: [7]},
            fields
        )).toBe(false);
    });

    it('returns false for unknown fields', () => {
        expect(isPredicateEnabled(
            {field: 'not_a_real_field', operator: 'is', values: ['anything']},
            fields
        )).toBe(false);
    });
});
