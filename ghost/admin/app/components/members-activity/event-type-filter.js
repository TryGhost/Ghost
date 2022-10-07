import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

const ALL_EVENT_TYPES = [
    {event: 'signup_event', icon: 'event-filter-signup', name: 'Signups'},
    {event: 'login_event', icon: 'event-filter-login', name: 'Logins'},
    {event: 'subscription_event', icon: 'event-filter-subscription', name: 'Paid subscriptions'},
    {event: 'payment_event', icon: 'event-filter-payment', name: 'Payments'},
    {event: 'newsletter_event', icon: 'event-filter-newsletter', name: 'Email subscriptions'},
    {event: 'email_opened_event', icon: 'event-filter-email-opened', name: 'Email opens'},
    {event: 'email_delivered_event', icon: 'event-filter-email-delivered', name: 'Email deliveries'},
    {event: 'email_failed_event', icon: 'event-filter-email-failed', name: 'Email failures'}
];

export default class MembersActivityEventTypeFilter extends Component {
    @service settings;
    @service feature;

    get availableEventTypes() {
        const extended = [...ALL_EVENT_TYPES];
        if (this.settings.commentsEnabled !== 'off') {
            extended.push({event: 'comment_event', icon: 'event-comment', name: 'Comments'});
        }

        if (this.args.hiddenEvents?.length) {
            return extended.filter(t => !this.args.hiddenEvents.includes(t.event));
        } else {
            return extended;
        }
    }

    get eventTypes() {
        const excludedEvents = (this.args.excludedEvents || '').split(',');

        return this.availableEventTypes.map(type => ({
            event: type.event,
            icon: type.icon,
            name: type.name,
            isSelected: !excludedEvents.includes(type.event)
        }));
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
