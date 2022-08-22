import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

const ALL_EVENT_TYPES = [
    {event: 'created', icon: 'event-filter-signup', name: 'Created'},
    {event: 'edited', icon: 'event-filter-login', name: 'Edited'},
    {event: 'deleted', icon: 'event-filter-subscription', name: 'Deleted'},
    {event: 'post', icon: 'event-filter-payment', name: 'Posts'},
    {event: 'pages', icon: 'event-filter-payment', name: 'Pages'},
    {event: 'tag', icon: 'event-filter-newsletter', name: 'Tags'},
    {event: 'integration', icon: 'event-filter-newsletter', name: 'Integrations'},
    {event: 'api_key', icon: 'event-filter-newsletter', name: 'API keys'},
    {event: 'label', icon: 'event-filter-newsletter', name: 'Labels'}
];

export default class AuditLogEventFilter extends Component {
    @service settings;
    @service feature;

    get availableEventTypes() {
        const extended = [...ALL_EVENT_TYPES];

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
