import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

const ALL_EVENT_TYPES = [
    {event: 'signup_event', icon: 'filter-dropdown-signups', name: 'Signups', group: 'auth'},
    {event: 'login_event', icon: 'filter-dropdown-logins', name: 'Logins', group: 'auth'},
    {event: 'subscription_event', icon: 'filter-dropdown-paid-subscriptions', name: 'Paid subscriptions', group: 'payments'},
    {event: 'payment_event', icon: 'filter-dropdown-payments', name: 'Payments', group: 'payments'},
    {event: 'newsletter_event', icon: 'filter-dropdown-email-subscriptions', name: 'Email subscriptions', group: 'emails'},
    {event: 'email_opened_event', icon: 'filter-dropdown-email-opened', name: 'Email opened', group: 'emails'},
    {event: 'email_delivered_event', icon: 'filter-dropdown-email-received', name: 'Email received', group: 'emails'},
    {event: 'email_complaint_event', icon: 'filter-dropdown-email-flagged-as-spam', name: 'Email flagged as spam', group: 'emails'},
    {event: 'email_failed_event', icon: 'filter-dropdown-email-bounced', name: 'Email bounced', group: 'emails'}
];

export default class MembersActivityEventTypeFilter extends Component {
    @service settings;
    @service feature;

    getAvailableEventTypes() {
        const extended = [...ALL_EVENT_TYPES];

        if (this.settings.commentsEnabled !== 'off') {
            extended.push({event: 'comment_event', icon: 'filter-dropdown-comments', name: 'Comments', group: 'others'});
        }
        if (this.feature.audienceFeedback) {
            extended.push({event: 'feedback_event', icon: 'filter-dropdown-feedback', name: 'Feedback', group: 'others'});
        }
        if (this.settings.emailTrackClicks) {
            extended.push({event: 'click_event', icon: 'filter-dropdown-clicked-in-email', name: 'Clicked link in email', group: 'others'});
        }

        if (this.args.hiddenEvents?.length) {
            return extended.filter(t => !this.args.hiddenEvents.includes(t.event));
        } else {
            return extended;
        }
    }

    get eventTypes() {
        const excludedEvents = (this.args.excludedEvents || '').split(',');
        const availableEventTypes = this.getAvailableEventTypes();

        return availableEventTypes.map((type, i) => ({
            event: type.event,
            icon: type.icon,
            name: type.name,
            divider: this.needDivider(type, availableEventTypes[i - 1]),
            isSelected: !excludedEvents.includes(type.event)
        }));
    }

    needDivider(event, prevEvent) {
        if (!event?.group || !prevEvent?.group) {
            return false;
        }
        return event.group !== prevEvent.group;
    }

    @action
    toggleEventType(eventType) {
        const excludedEvents = new Set(this.eventTypes.reject(type => type.isSelected).map(type => type.event));

        if (excludedEvents.has(eventType)) {
            excludedEvents.delete(eventType);
        } else {
            excludedEvents.add(eventType);
        }

        const excludeString = Array.from(excludedEvents).join(',');

        this.args.onChange(excludeString || null);
    }
}
