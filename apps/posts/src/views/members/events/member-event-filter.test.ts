import {
    buildEventsPageFilter,
    buildMembersEventFilter,
    formatEventCursor,
    getNextEventsPageParams,
    splitEventsFilter
} from './member-event-filter';
import {describe, expect, it} from 'vitest';
import type {MemberEvent} from '@tryghost/admin-x-framework/api/members';

const enabledSettings = {emailDisabled: false, commentsDisabled: false};

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
        expect(buildMembersEventFilter({member: 'member-1', settings: enabledSettings}))
            .toBe(`data.member_id:'member-1'`);
    });

    it('combines exclusions and member filter', () => {
        expect(buildMembersEventFilter({
            excludedEvents: ['aggregated_click_event'],
            member: 'member-1',
            settings: enabledSettings
        })).toBe(`type:-[aggregated_click_event]+data.member_id:'member-1'`);
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
