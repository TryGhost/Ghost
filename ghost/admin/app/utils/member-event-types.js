export const ALL_EVENT_TYPES = [
    {event: 'signup_event', icon: 'filter-dropdown-signups', name: 'Signups', group: 'auth'},
    {event: 'login_event', icon: 'filter-dropdown-logins', name: 'Logins', group: 'auth'},
    {event: 'subscription_event', icon: 'filter-dropdown-paid-subscriptions', name: 'Paid subscriptions', group: 'payments'},
    {event: 'payment_event', icon: 'filter-dropdown-payments', name: 'Payments', group: 'payments'},
    {event: 'newsletter_event', icon: 'filter-dropdown-email-subscriptions', name: 'Email subscriptions', group: 'emails'},
    {event: 'email_opened_event', icon: 'filter-dropdown-email-opened', name: 'Email opened', group: 'emails'},
    {event: 'email_delivered_event', icon: 'filter-dropdown-email-received', name: 'Email received', group: 'emails'},
    {event: 'email_complaint_event', icon: 'filter-dropdown-email-flagged-as-spam', name: 'Email flagged as spam', group: 'emails'},
    {event: 'email_failed_event', icon: 'filter-dropdown-email-bounced', name: 'Email bounced', group: 'emails'},
    {event: 'email_change_event', icon: 'filter-dropdown-email-address-changed', name: 'Email address changed', group: 'emails'}
];

export function getAvailableEventTypes(settings, feature, hiddenEvents = []) {
    const extended = [...ALL_EVENT_TYPES];

    if (settings.commentsEnabled !== 'off') {
        extended.push({event: 'comment_event', icon: 'filter-dropdown-comments', name: 'Comments', group: 'others'});
    }
    if (feature.audienceFeedback) {
        extended.push({event: 'feedback_event', icon: 'filter-dropdown-feedback', name: 'Feedback', group: 'others'});
    }
    if (settings.emailTrackClicks) {
        extended.push({event: 'click_event', icon: 'filter-dropdown-clicked-in-email', name: 'Clicked link in email', group: 'others'});
    }

    return extended.filter(t => !hiddenEvents.includes(t.event));
}

export function toggleEventType(eventType, eventTypes) {
    const excludedEvents = new Set(eventTypes.filter(type => !type.isSelected).map(type => type.event));

    if (eventType === 'payment_event') {
        if (excludedEvents.has('payment_event')) {
            excludedEvents.delete('payment_event');
            excludedEvents.delete('donation_event');
        } else {
            excludedEvents.add('payment_event');
            excludedEvents.add('donation_event');
        }
    } else {
        if (excludedEvents.has(eventType)) {
            excludedEvents.delete(eventType);
        } else {
            excludedEvents.add(eventType);
        }
    }

    return Array.from(excludedEvents).join(',');
}

export function needDivider(event, prevEvent) {
    if (!event?.group || !prevEvent?.group) {
        return false;
    }
    return event.group !== prevEvent.group;
}
