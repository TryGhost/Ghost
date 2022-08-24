import Component from '@glimmer/component';
import {action} from '@ember/object';

const ALL_EVENT_TYPES = [
    {event: 'added', name: 'Added'},
    {event: 'edited', name: 'Edited'},
    {event: 'deleted', name: 'Deleted'}
];

const ALL_RESOURCE_TYPES = [
    {event: 'post', name: 'Posts'},
    {event: 'page', name: 'Pages'},
    {event: 'tag', name: 'Tags'},
    {event: 'label', name: 'Member labels'},
    {event: 'user', name: 'Users'},
    {event: 'setting', name: 'Settings'},
    {event: 'integration', name: 'Integrations'},
    {event: 'api_key', name: 'API keys'},
    {event: 'webhook', name: 'Webhooks'}
];

export default class AuditLogEventFilter extends Component {
    excludedEvents = null;
    excludedResources = null;

    get eventTypes() {
        const excludedEvents = (this.args.excludedEvents || '').split(',');

        return ALL_EVENT_TYPES.map(type => ({
            event: type.event,
            name: type.name,
            isSelected: !excludedEvents.includes(type.event)
        }));
    }

    get resourceTypes() {
        const excludedEvents = (this.args.excludedResources || '').split(',');

        return ALL_RESOURCE_TYPES.map(type => ({
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
