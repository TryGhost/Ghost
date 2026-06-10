import {ALL_EVENT_TYPES, toggleEventType} from './member-event-types';
import {
    KNOWN_EVENT_TYPE_IDS,
    buildEventsPageFilter,
    buildMembersEventFilter,
    formatEventCursor,
    getNextEventsPageParams,
    sanitizeExcludedEvents,
    sanitizeMemberId,
    splitEventsFilter
} from './member-event-filter';
import {describe, expect, it} from 'vitest';
import type {MemberEvent} from '@tryghost/admin-x-framework/api/members';

const enabledSettings = {emailDisabled: false, commentsDisabled: false};
const memberId = '6543c13c0a342baa1ed6a01b';

function makeEvents(createdAts: string[]): MemberEvent[] {
    return createdAts.map((createdAt, index) => ({
        id: `event-${index}`,
        type: 'signup_event',
        data: {created_at: createdAt}
    }));
}

describe('buildMembersEventFilter', () => {
    it('returns an empty filter without exclusions or member', () => {
        expect(buildMembersEventFilter({settings: enabledSettings})).toBe('');
    });

    it('excludes event types', () => {
        expect(buildMembersEventFilter({
            excludedEvents: ['signup_event', 'login_event'],
            settings: enabledSettings
        })).toBe('type:-[signup_event,login_event]');
    });

    it('filters by member id', () => {
        expect(buildMembersEventFilter({member: memberId, settings: enabledSettings}))
            .toBe(`data.member_id:'${memberId}'`);
    });

    it('combines exclusions and member filter', () => {
        expect(buildMembersEventFilter({
            excludedEvents: ['aggregated_click_event'],
            member: memberId,
            settings: enabledSettings
        })).toBe(`type:-[aggregated_click_event]+data.member_id:'${memberId}'`);
    });

    it('drops a member param that is not an object id', () => {
        expect(buildMembersEventFilter({
            member: `'+type:-[signup_event]+data.member_id:'${memberId}`,
            settings: enabledSettings
        })).toBe('');
        expect(buildMembersEventFilter({member: 'admin', settings: enabledSettings})).toBe('');
        expect(buildMembersEventFilter({member: `${memberId}ff`, settings: enabledSettings})).toBe('');
    });

    it('drops excluded events that are not known event types', () => {
        expect(buildMembersEventFilter({
            excludedEvents: [`signup_event]+data.member_id:'${memberId}'+type:-[login_event`, 'login_event'],
            settings: enabledSettings
        })).toBe('type:-[login_event]');
    });

    it('excludes email and newsletter events when email is disabled', () => {
        const filter = buildMembersEventFilter({settings: {emailDisabled: true, commentsDisabled: false}});

        expect(filter).toContain('email_sent_event');
        expect(filter).toContain('email_complaint_event');
        expect(filter).toContain('newsletter_event');
    });

    it('excludes comment events when comments are disabled', () => {
        expect(buildMembersEventFilter({settings: {emailDisabled: false, commentsDisabled: true}}))
            .toBe('type:-[comment_event]');
    });

    it('deduplicates excluded events', () => {
        expect(buildMembersEventFilter({
            excludedEvents: ['comment_event'],
            settings: {emailDisabled: false, commentsDisabled: true}
        })).toBe('type:-[comment_event]');
    });

    it('ignores blank excluded events', () => {
        expect(buildMembersEventFilter({
            excludedEvents: ['', 'signup_event'],
            settings: enabledSettings
        })).toBe('type:-[signup_event]');
    });
});

describe('sanitizeMemberId', () => {
    it('accepts 24-char hex object ids (case-insensitive)', () => {
        expect(sanitizeMemberId(memberId)).toBe(memberId);
        expect(sanitizeMemberId(memberId.toUpperCase())).toBe(memberId.toUpperCase());
    });

    it('treats anything else as absent', () => {
        expect(sanitizeMemberId(null)).toBe('');
        expect(sanitizeMemberId(undefined)).toBe('');
        expect(sanitizeMemberId('')).toBe('');
        expect(sanitizeMemberId('member-1')).toBe('');
        expect(sanitizeMemberId(`x${memberId.slice(1)}`)).toBe('');
        expect(sanitizeMemberId(`'+data.member_id:'${memberId}`)).toBe('');
    });
});

describe('sanitizeExcludedEvents', () => {
    it('keeps known event type ids and drops everything else', () => {
        expect(sanitizeExcludedEvents([
            'signup_event',
            'gift_purchase_event',
            '',
            'type:1',
            `login_event]+data.member_id:'${memberId}'`
        ])).toEqual(['signup_event', 'gift_purchase_event']);
    });

    it('covers every filterable event type, including grouped toggles', () => {
        const filterableIds = ALL_EVENT_TYPES.map(type => type.event);
        // grouped toggles also write these ids into the excludedEvents param
        const toggledIds = [
            ...toggleEventType('subscription_event').split(','),
            ...toggleEventType('payment_event').split(','),
            'comment_event',
            'click_event'
        ];

        for (const id of [...filterableIds, ...toggledIds]) {
            expect(KNOWN_EVENT_TYPE_IDS.has(id), id).toBe(true);
        }
    });
});

describe('formatEventCursor', () => {
    it('formats timestamps as UTC second-precision cursors', () => {
        expect(formatEventCursor('2025-06-01T10:20:30.456Z')).toBe('2025-06-01 10:20:30');
    });
});

describe('buildEventsPageFilter / splitEventsFilter', () => {
    it('round-trips cursor and base filter', () => {
        const filter = buildEventsPageFilter('2025-06-01 10:20:30', `type:-[signup_event]+data.member_id:'m1'`);

        expect(filter).toBe(`data.created_at:<'2025-06-01 10:20:30'+type:-[signup_event]+data.member_id:'m1'`);
        expect(splitEventsFilter(filter)).toEqual({
            cursor: '2025-06-01 10:20:30',
            baseFilter: `type:-[signup_event]+data.member_id:'m1'`
        });
    });

    it('handles an empty base filter', () => {
        const filter = buildEventsPageFilter('2025-06-01 10:20:30', '');

        expect(filter).toBe(`data.created_at:<'2025-06-01 10:20:30'`);
        expect(splitEventsFilter(filter)).toEqual({cursor: '2025-06-01 10:20:30', baseFilter: ''});
    });
});

describe('getNextEventsPageParams', () => {
    const params = {
        limit: '2',
        filter: buildEventsPageFilter('2025-06-03 00:00:00', 'type:-[aggregated_click_event]')
    };

    it('advances the cursor to the last event of the page', () => {
        const lastPage = {events: makeEvents(['2025-06-02T10:00:00.000Z', '2025-06-01T10:00:00.000Z'])};

        expect(getNextEventsPageParams(lastPage, params)).toEqual({
            limit: '2',
            filter: `data.created_at:<'2025-06-01 10:00:00'+type:-[aggregated_click_event]`
        });
    });

    it('stops on a short page', () => {
        const lastPage = {events: makeEvents(['2025-06-02T10:00:00.000Z'])};

        expect(getNextEventsPageParams(lastPage, params)).toBeUndefined();
    });

    it('stops when the cursor no longer advances', () => {
        const lastPage = {events: makeEvents(['2025-06-03T00:00:00.000Z', '2025-06-03T00:00:00.000Z'])};

        expect(getNextEventsPageParams(lastPage, params)).toBeUndefined();
    });

    it('stops when the page has no events', () => {
        expect(getNextEventsPageParams({events: []}, params)).toBeUndefined();
    });
});
