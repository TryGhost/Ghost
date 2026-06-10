import {EMAIL_EVENTS, NEWSLETTER_EVENTS} from './member-event-filter';

/**
 * Port of the Ember `utils/member-event-types` module: the list of event
 * types available in the activity filter dropdown plus the toggle semantics
 * (some toggles control multiple underlying event types).
 */

export interface MemberEventTypeOption {
    event: string;
    name: string;
    group: 'auth' | 'payments' | 'emails' | 'others';
}

export const ALL_EVENT_TYPES: MemberEventTypeOption[] = [
    {event: 'signup_event', name: 'Signups', group: 'auth'},
    {event: 'login_event', name: 'Logins', group: 'auth'},
    {event: 'subscription_event', name: 'Paid subscriptions', group: 'payments'},
    {event: 'payment_event', name: 'Payments', group: 'payments'},
    {event: 'newsletter_event', name: 'Email subscriptions', group: 'emails'},
    {event: 'email_opened_event', name: 'Email opened', group: 'emails'},
    {event: 'email_delivered_event', name: 'Email received', group: 'emails'},
    {event: 'email_complaint_event', name: 'Email flagged as spam', group: 'emails'},
    {event: 'email_failed_event', name: 'Email bounced', group: 'emails'},
    {event: 'email_change_event', name: 'Email address changed', group: 'emails'},
    {event: 'automated_email_sent_event', name: 'Welcome email received', group: 'emails'},
    {event: 'feedback_event', name: 'Feedback', group: 'others'}
];

export interface MemberEventTypeSettings {
    /** comments_enabled !== 'off' */
    commentsEnabled: boolean;
    /** email_track_clicks */
    emailTrackClicks: boolean;
}

export function getAvailableEventTypes(
    settings: MemberEventTypeSettings,
    hiddenEvents: string[] = []
): MemberEventTypeOption[] {
    const extended = [...ALL_EVENT_TYPES];

    if (settings.commentsEnabled) {
        extended.push({event: 'comment_event', name: 'Comments', group: 'others'});
    }
    if (settings.emailTrackClicks) {
        extended.push({event: 'click_event', name: 'Clicked link in email', group: 'others'});
    }

    return extended.filter(type => !hiddenEvents.includes(type.event));
}

export function toggleEventType(eventType: string, currentExcludedEvents: string[] | string = []): string {
    const excludedEvents = new Set(
        Array.isArray(currentExcludedEvents)
            ? currentExcludedEvents
            : (currentExcludedEvents || '').split(',').filter(Boolean)
    );

    const toggleGroup = (types: string[]) => {
        if (excludedEvents.has(types[0])) {
            types.forEach(type => excludedEvents.delete(type));
        } else {
            types.forEach(type => excludedEvents.add(type));
        }
    };

    if (eventType === 'subscription_event') {
        toggleGroup(['subscription_event', 'gift_redemption_event', 'gift_ended_event']);
    } else if (eventType === 'payment_event') {
        toggleGroup(['payment_event', 'donation_event', 'gift_purchase_event']);
    } else {
        toggleGroup([eventType]);
    }

    return Array.from(excludedEvents).join(',');
}

export function needDivider(
    event: MemberEventTypeOption | undefined,
    prevEvent: MemberEventTypeOption | undefined
): boolean {
    if (!event?.group || !prevEvent?.group) {
        return false;
    }
    return event.group !== prevEvent.group;
}

/**
 * Event types hidden from the activity screen (and its filter dropdown):
 * - without a member filter, email events flood the list and the API can't
 *   paginate them correctly
 * - aggregated click events are never shown
 * - when newsletters are disabled, email and newsletter events are meaningless
 *
 * Port of the Ember members-activity controller's `hiddenEvents` getter.
 */
export function getHiddenActivityEvents({hasMemberFilter, emailDisabled}: {
    hasMemberFilter: boolean;
    emailDisabled: boolean;
}): string[] {
    const hiddenEvents: string[] = [];

    if (!hasMemberFilter) {
        hiddenEvents.push(...EMAIL_EVENTS);
    }

    hiddenEvents.push('aggregated_click_event');

    if (emailDisabled) {
        hiddenEvents.push(...EMAIL_EVENTS, ...NEWSLETTER_EVENTS);
    }

    return hiddenEvents;
}
