import Component from '@glimmer/component';
import {action} from '@ember/object';

const ALL_EVENT_TYPES = [
    {event: 'added', name: 'Added'},
    {event: 'edited', name: 'Edited'},
    {event: 'deleted', name: 'Deleted'}
];

const ALL_RESOURCE_TYPES = [
    {targets: 'post', name: 'Posts'},
    {targets: 'page', name: 'Pages'},
    {targets: 'tag', name: 'Tags'},
    {targets: 'label,member', name: 'Members'},
    {targets: 'offer,product', name: 'Tiers & offers'},
    {targets: 'api_key,integration,setting,user,webhook', name: 'Settings & users'}
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
        const excludedResources = (this.args.excludedResources || '').split(',');

        return ALL_RESOURCE_TYPES.map(type => ({
            targets: type.targets,
            name: type.name,
            isSelected: !type.targets.split(',').every(t => excludedResources.includes(t))
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
        const resourceTypeElements = resourceType.split(',');
        const excludedResources = new Set(this.resourceTypes.reject(type => type.isSelected).flatMap(type => type.targets.split(',')));

        for (const resource of resourceTypeElements) {
            if (excludedResources.has(resource)) {
                excludedResources.delete(resource);
            } else {
                excludedResources.add(resource);
            }
        }

        this.excludedResources = Array.from(excludedResources).join(',');
        this.args.onChange({
            excludedEvents: this.excludedEvents,
            excludedResources: this.excludedResources
        });
    }
}
