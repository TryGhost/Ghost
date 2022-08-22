import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

const ALL_EVENT_TYPES = [
    {event: 'added', icon: 'event-filter-signup', name: 'Added'},
    {event: 'edited', icon: 'event-filter-login', name: 'Edited'},
    {event: 'deleted', icon: 'event-filter-subscription', name: 'Deleted'}
];

const ALL_RESOURCE_TYPES = [
    {event: 'post', icon: 'event-filter-payment', name: 'Posts'},
    {event: 'page', icon: 'event-filter-payment', name: 'Pages'},
    {event: 'tag', icon: 'event-filter-newsletter', name: 'Tags'},
    {event: 'user', icon: 'idk', name: 'Users'},
    {event: 'integration', icon: 'event-filter-newsletter', name: 'Integrations'},
    {event: 'api_key', icon: 'event-filter-newsletter', name: 'API keys'},
    {event: 'webhook', icon: 'event-filter-newsletter', name: 'Webhooks'},
    {event: 'label', icon: 'event-filter-newsletter', name: 'Labels'}
];

export default class AuditLogEventFilter extends Component {
    @service settings;
    @service feature;

    excludedEvents = null;
    excludedResources = null;

    get eventTypes() {
        const excludedEvents = (this.args.excludedEvents || '').split(',');

        return ALL_EVENT_TYPES.map(type => ({
            event: type.event,
            icon: type.icon,
            name: type.name,
            isSelected: !excludedEvents.includes(type.event)
        }));
    }

    get resourceTypes() {
        const excludedEvents = (this.args.excludedResources || '').split(',');

        return ALL_RESOURCE_TYPES.map(type => ({
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

        this.excludedEvents = Array.from(excludedEvents).join(',');
        this.args.onChange({
            excludedEvents: this.excludedEvents,
            excludedResources: this.excludedResources
        });
    }

    @action
    toggleResourceType(resourceType) {
        const excludedResources = new Set(this.resourceTypes.reject(type => type.isSelected).map(type => type.event));

        if (excludedResources.has(resourceType)) {
            excludedResources.delete(resourceType);
        } else {
            excludedResources.add(resourceType);
        }

        this.excludedResources = Array.from(excludedResources).join(',');
        this.args.onChange({
            excludedEvents: this.excludedEvents,
            excludedResources: this.excludedResources
        });
    }
}
