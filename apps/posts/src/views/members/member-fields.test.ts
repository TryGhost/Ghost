import {describe, expect, it} from 'vitest';
import {memberFields} from './member-fields';
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
            'offer_redemptions'
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
        expect(memberFields.created_at.operators).toEqual([
            'is-less',
            'is-or-less',
            'is-greater',
            'is-or-greater'
        ]);
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

describe('memberDateCodec', () => {
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
