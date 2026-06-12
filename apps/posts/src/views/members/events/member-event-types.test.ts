import {ALL_EVENT_TYPES, getAvailableEventTypes, getHiddenActivityEvents, needDivider, toggleEventType} from './member-event-types';
import {describe, expect, it} from 'vitest';

const allSettings = {commentsEnabled: true, emailTrackClicks: true};

describe('getAvailableEventTypes', () => {
    it('includes comments and clicked links when enabled', () => {
        const types = getAvailableEventTypes(allSettings).map(type => type.event);

        expect(types).toContain('comment_event');
        expect(types).toContain('click_event');
        expect(types).toEqual(expect.arrayContaining(ALL_EVENT_TYPES.map(type => type.event)));
    });

    it('omits comments and clicked links when disabled', () => {
        const types = getAvailableEventTypes({commentsEnabled: false, emailTrackClicks: false}).map(type => type.event);

        expect(types).not.toContain('comment_event');
        expect(types).not.toContain('click_event');
    });

    it('filters out hidden events', () => {
        const types = getAvailableEventTypes(allSettings, ['signup_event']).map(type => type.event);

        expect(types).not.toContain('signup_event');
    });
});

describe('toggleEventType', () => {
    it('adds and removes a simple event type', () => {
        expect(toggleEventType('signup_event', '')).toBe('signup_event');
        expect(toggleEventType('signup_event', 'signup_event')).toBe('');
        expect(toggleEventType('login_event', ['signup_event'])).toBe('signup_event,login_event');
    });

    it('toggles the gift events together with subscription events', () => {
        const excluded = toggleEventType('subscription_event', '');

        expect(excluded.split(',').sort()).toEqual([
            'gift_ended_event',
            'gift_redemption_event',
            'subscription_event'
        ]);
        expect(toggleEventType('subscription_event', excluded)).toBe('');
    });

    it('toggles donations and gift purchases together with payment events', () => {
        const excluded = toggleEventType('payment_event', '');

        expect(excluded.split(',').sort()).toEqual([
            'donation_event',
            'gift_purchase_event',
            'payment_event'
        ]);
        expect(toggleEventType('payment_event', excluded)).toBe('');
    });
});

describe('needDivider', () => {
    it('adds a divider between groups only', () => {
        const [signup, , subscription] = ALL_EVENT_TYPES;

        expect(needDivider(subscription, signup)).toBe(true);
        expect(needDivider(ALL_EVENT_TYPES[1], signup)).toBe(false);
        expect(needDivider(signup, undefined)).toBe(false);
    });
});

describe('getHiddenActivityEvents', () => {
    it('hides email events when no member is selected', () => {
        const hidden = getHiddenActivityEvents({hasMemberFilter: false, emailDisabled: false});

        expect(hidden).toContain('email_opened_event');
        expect(hidden).toContain('aggregated_click_event');
        expect(hidden).not.toContain('newsletter_event');
    });

    it('only hides aggregated clicks when a member is selected', () => {
        expect(getHiddenActivityEvents({hasMemberFilter: true, emailDisabled: false}))
            .toEqual(['aggregated_click_event']);
    });

    it('hides email and newsletter events when email is disabled', () => {
        const hidden = getHiddenActivityEvents({hasMemberFilter: true, emailDisabled: true});

        expect(hidden).toContain('email_opened_event');
        expect(hidden).toContain('newsletter_event');
    });
});
