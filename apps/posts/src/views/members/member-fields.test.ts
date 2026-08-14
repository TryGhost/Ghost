import {describe, expect, it} from 'vitest';
import {getMemberFields, memberFields} from './member-fields';
import type {CodecContext, FilterPredicate} from '../filters/filter-types';

const dateContext: CodecContext = {
    key: 'created_at',
    pattern: 'created_at',
    params: {},
    timezone: 'UTC'
};

const newsletterContext: CodecContext = {
    key: 'newsletters.weekly',
    pattern: 'newsletters.:slug',
    params: {slug: 'weekly'},
    timezone: 'UTC'
};

describe('memberFields', () => {
    it('defines the expected member field set', () => {
        expect(Object.keys(memberFields)).toEqual([
            'name',
            'email',
            'label',
            'subscribed',
            'last_seen_at',
            'created_at',
            'signup',
            'newsletters.:slug',
            'tier_id',
            'status',
            'subscriptions.plan_interval',
            'subscriptions.status',
            'subscriptions.start_date',
            'subscriptions.current_period_end',
            'conversion',
            'email_count',
            'email_opened_count',
            'email_open_rate',
            'emails.post_id',
            'opened_emails.post_id',
            'clicked_links.post_id',
            'newsletter_feedback',
            'offer_redemptions',
            'count.active_stripe_customers'
        ]);
    });

    it('keeps the expected operators for key member fields', () => {
        expect(memberFields.label.operators).toEqual(['is-any', 'is-not-any']);
        expect(memberFields.tier_id.operators).toEqual(['is-any', 'is-not-any']);
        expect(memberFields['newsletters.:slug'].operators).toEqual(['is']);
        expect(memberFields.newsletter_feedback.operators).toEqual(['1', '0']);
        expect(memberFields.email_count.operators).toEqual([
            'is',
            'is-greater',
            'is-less'
        ]);
        const pastDateOperators = ['is-less', 'is-or-less', 'is-greater', 'is-or-greater', 'in-the-last'];
        const futureDateOperators = ['is-less', 'is-or-less', 'is-greater', 'is-or-greater', 'in-the-next'];

        expect(memberFields.created_at.operators).toEqual(pastDateOperators);
        expect(memberFields.last_seen_at.operators).toEqual(pastDateOperators);
        expect(memberFields['subscriptions.start_date'].operators).toEqual(pastDateOperators);
        expect(memberFields['subscriptions.current_period_end'].operators).toEqual(futureDateOperators);
    });

    it('always appends the past/future relative operator to member date fields', () => {
        const fields = getMemberFields();

        expect(fields.created_at.operators).toContain('in-the-last');
        expect(fields.last_seen_at.operators).toContain('in-the-last');
        expect(fields['subscriptions.start_date'].operators).toContain('in-the-last');
        expect(fields['subscriptions.current_period_end'].operators).toContain('in-the-next');
    });

    it('keeps the expected subscription status options', () => {
        expect(memberFields['subscriptions.status'].options).toEqual([
            {value: 'active', label: 'Active'},
            {value: 'trialing', label: 'Trialing'},
            {value: 'canceled', label: 'Canceled'},
            {value: 'unpaid', label: 'Unpaid'},
            {value: 'past_due', label: 'Past Due'},
            {value: 'incomplete', label: 'Incomplete'},
            {value: 'incomplete_expired', label: 'Incomplete - Expired'}
        ]);
    });

    it('keeps active-column metadata local to the field map', () => {
        expect(memberFields.label.metadata).toEqual({
            activeColumn: {
                key: 'labels',
                label: 'Labels',
                include: 'labels'
            }
        });

        expect(memberFields.tier_id.metadata).toEqual({
            activeColumn: {
                key: 'tiers',
                label: 'Tiers',
                include: 'tiers'
            }
        });

        expect(memberFields['subscriptions.current_period_end'].metadata).toEqual({
            activeColumn: {
                key: 'subscriptions.current_period_end',
                label: 'Next billing date',
                include: 'subscriptions'
            }
        });
    });

    it('uses local codecs for member-specific fields', () => {
        expect(memberFields.created_at.codec).not.toBe(memberFields.status.codec);
        expect(memberFields.subscribed.codec).not.toBe(memberFields.status.codec);
        expect(memberFields['newsletters.:slug'].codec).not.toBe(memberFields.status.codec);
        expect(memberFields.newsletter_feedback.codec).not.toBe(memberFields.status.codec);
    });

    it('keeps subscribed parsing out of shared parse aliases', () => {
        expect('parseKeys' in memberFields.subscribed).toBe(false);
    });
});

describe('dateCodec', () => {
    it('serializes date boundaries in UTC day bounds', () => {
        const predicate: FilterPredicate = {
            id: '1',
            field: 'created_at',
            operator: 'is-or-less',
            values: ['2024-01-01']
        };

        expect(memberFields.created_at.codec.serialize(predicate, dateContext)).toEqual([
            'created_at:<=\'2024-01-01T23:59:59.999Z\''
        ]);
    });
});

describe('multipleActiveSubscriptionsCodec', () => {
    const field = memberFields['count.active_stripe_customers'];
    const context: CodecContext = {
        key: 'count.active_stripe_customers',
        pattern: 'count.active_stripe_customers',
        params: {},
        timezone: 'UTC'
    };

    it('serializes the Yes/No predicate to count comparisons', () => {
        const predicate: FilterPredicate = {
            id: '1',
            field: 'count.active_stripe_customers',
            operator: 'is',
            values: ['true']
        };

        expect(field.codec.serialize(predicate, context)).toEqual([
            'count.active_stripe_customers:>1'
        ]);
        expect(field.codec.serialize({...predicate, values: ['false']}, context)).toEqual([
            'count.active_stripe_customers:<2'
        ]);
    });

    it('rejects unknown values and other operators', () => {
        const predicate: FilterPredicate = {
            id: '1',
            field: 'count.active_stripe_customers',
            operator: 'is',
            values: [true]
        };

        expect(field.codec.serialize(predicate, context)).toBeNull();
        expect(field.codec.serialize({...predicate, values: [1]}, context)).toBeNull();
        expect(field.codec.serialize({...predicate, operator: 'is-greater', values: ['true']}, context)).toBeNull();
    });

    it('parses only the comparisons it serializes', () => {
        expect(field.codec.parse({'count.active_stripe_customers': {$gt: 1}}, context)).toEqual({
            field: 'count.active_stripe_customers',
            operator: 'is',
            values: ['true']
        });
        expect(field.codec.parse({'count.active_stripe_customers': {$lt: 2}}, context)).toEqual({
            field: 'count.active_stripe_customers',
            operator: 'is',
            values: ['false']
        });
        expect(field.codec.parse({'count.active_stripe_customers': {$gt: 2}}, context)).toBeNull();
        expect(field.codec.parse({'count.active_stripe_customers': 1}, context)).toBeNull();
    });
});

describe('newsletterCodec', () => {
    it('serializes newsletter subscription state from a pattern field', () => {
        const predicate: FilterPredicate = {
            id: '1',
            field: 'newsletters.weekly',
            operator: 'is',
            values: ['subscribed']
        };

        expect(memberFields['newsletters.:slug'].codec.serialize(predicate, newsletterContext)).toEqual([
            '(newsletters.slug:weekly+email_disabled:0)'
        ]);
    });
});
