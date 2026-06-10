import moment from 'moment-timezone';
import type {MemberEventsResponseType} from '@tryghost/admin-x-framework/api/members';

export const EMAIL_EVENTS = [
    'email_sent_event',
    'email_delivered_event',
    'email_opened_event',
    'email_failed_event',
    'email_complaint_event'
];

export const NEWSLETTER_EVENTS = ['newsletter_event'];

/**
 * Every event type id that can legitimately appear in a `type:-[...]` NQL
 * exclusion: the filterable list in member-event-types.ts, the extra ids its
 * grouped toggles write (gift/donation events) and the always-hidden
 * aggregated click events. Anything else is dropped before the filter is
 * built so url params can't inject NQL.
 */
export const KNOWN_EVENT_TYPE_IDS: ReadonlySet<string> = new Set([
    ...EMAIL_EVENTS,
    ...NEWSLETTER_EVENTS,
    'signup_event',
    'login_event',
    'subscription_event',
    'gift_redemption_event',
    'gift_ended_event',
    'payment_event',
    'donation_event',
    'gift_purchase_event',
    'email_change_event',
    'automated_email_sent_event',
    'feedback_event',
    'comment_event',
    'click_event',
    'aggregated_click_event'
]);

const MEMBER_ID_PATTERN = /^[a-f0-9]{24}$/i;

/**
 * Returns the member id when it looks like an ObjectID, otherwise '' so the
 * value is treated as absent (the member param comes straight from the url
 * and is interpolated into an NQL filter).
 */
export function sanitizeMemberId(member?: string | null): string {
    return member && MEMBER_ID_PATTERN.test(member) ? member : '';
}

/** Drops anything that isn't a known event type id (see KNOWN_EVENT_TYPE_IDS). */
export function sanitizeExcludedEvents(excludedEvents: string[]): string[] {
    return excludedEvents.filter(type => KNOWN_EVENT_TYPE_IDS.has(type));
}

export interface MembersEventFilterSettings {
    /** editor_default_email_recipients === 'disabled' */
    emailDisabled: boolean;
    /** comments_enabled === 'off' */
    commentsDisabled: boolean;
}

/**
 * Port of the Ember `members-event-filter` helper: builds the NQL filter for
 * the members events endpoint from the excluded event types, an optional
 * member id and the site settings.
 */
export function buildMembersEventFilter({excludedEvents = [], member = '', settings}: {
    excludedEvents?: string[];
    member?: string;
    settings: MembersEventFilterSettings;
}): string {
    const excludedEventsSet = new Set<string>();

    if (settings.emailDisabled) {
        [...EMAIL_EVENTS, ...NEWSLETTER_EVENTS].forEach(type => excludedEventsSet.add(type));
    }
    if (settings.commentsDisabled) {
        excludedEventsSet.add('comment_event');
    }

    // sanitize at the general layer so every caller is protected: both values
    // originate from url params and end up inside an NQL filter
    sanitizeExcludedEvents(excludedEvents).forEach(type => excludedEventsSet.add(type));
    const safeMember = sanitizeMemberId(member);

    const filterParts: string[] = [];
    const excludedEventsArray = Array.from(excludedEventsSet).filter(type => type && type.trim() !== '');

    if (excludedEventsArray.length > 0) {
        filterParts.push(`type:-[${excludedEventsArray.join(',')}]`);
    }

    if (safeMember) {
        filterParts.push(`data.member_id:'${safeMember}'`);
    }

    return filterParts.join('+');
}

/**
 * Formats a timestamp the way the events endpoint expects cursors:
 * `YYYY-MM-DD HH:mm:ss` in UTC (matching the Ember members-event-fetcher).
 */
export function formatEventCursor(date: string | Date): string {
    return moment.utc(date).format('YYYY-MM-DD HH:mm:ss');
}

/**
 * The events endpoint is cursor-paginated: every request filters on
 * `data.created_at:<'<cursor>'` plus the base filter.
 */
export function buildEventsPageFilter(cursor: string, baseFilter: string): string {
    let filter = `data.created_at:<'${cursor}'`;

    if (baseFilter) {
        filter += `+${baseFilter}`;
    }

    return filter;
}

export function splitEventsFilter(filter: string): {cursor: string | null; baseFilter: string} {
    const match = filter.match(/^data\.created_at:<'([^']*)'(?:\+(.*))?$/);

    if (!match) {
        return {cursor: null, baseFilter: filter};
    }

    return {cursor: match[1], baseFilter: match[2] ?? ''};
}

/**
 * Computes the search params for the next events page from the previous page
 * of results. Returns undefined when the end has been reached (a short page,
 * or a cursor that no longer advances - which would otherwise loop forever).
 */
export function getNextEventsPageParams(
    lastPage: MemberEventsResponseType,
    params: Record<string, string>
): Record<string, string> | undefined {
    const limit = parseInt(params.limit ?? '15', 10);

    if (lastPage.events.length < limit) {
        return undefined;
    }

    const lastEvent = lastPage.events[lastPage.events.length - 1];

    if (!lastEvent?.data?.created_at) {
        return undefined;
    }

    const nextCursor = formatEventCursor(lastEvent.data.created_at);
    const {cursor: currentCursor, baseFilter} = splitEventsFilter(params.filter ?? '');

    if (nextCursor === currentCursor) {
        return undefined;
    }

    return {
        ...params,
        filter: buildEventsPageFilter(nextCursor, baseFilter)
    };
}
