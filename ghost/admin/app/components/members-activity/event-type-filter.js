import Component from '@glimmer/component';
import {action} from '@ember/object';

const ALL_EVENT_TYPES = [
    {event: 'signup_event', name: 'Signups'},
    {event: 'login_event', name: 'Logins'},
    {event: 'subscription_event', name: 'Paid subscription changes'},
    {event: 'payment_event', name: 'Payments'},
    {event: 'newsletter_event', name: 'Email subscription changes'},
    {event: 'email_delivered_event', name: 'Email deliveries', memberOnly: true},
    {event: 'email_opened_event', name: 'Email opens', memberOnly: true},
    {event: 'email_failed_event', name: 'Email failures', memberOnly: true}
];

export default class MembersActivityEventTypeFilter extends Component {
    get availableEventTypes() {
        if (this.args.hideMemberOnlyEvents) {
            return ALL_EVENT_TYPES.filter(t => !t.memberOnly);
        } else {
            return ALL_EVENT_TYPES;
        }
    }

    get eventTypes() {
        const excludedEvents = (this.args.excludedEvents || '').split(',');

        return this.availableEventTypes.map(type => ({
            event: type.event,
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

        this.args.updateExcludedEvents(excludeString || null);
    }
}
