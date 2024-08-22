import Component from '@glimmer/component';
import {action} from '@ember/object';
import {getAvailableEventTypes, needDivider, toggleEventType} from 'ghost-admin/utils/member-event-types';
import {inject as service} from '@ember/service';

export default class MembersActivityEventTypeFilter extends Component {
    @service settings;
    @service feature;

    getAvailableEventTypes() {
        return getAvailableEventTypes(this.settings, this.feature, this.args.hiddenEvents);
    }

    get eventTypes() {
        const excludedEvents = (this.args.excludedEvents || '').split(',');
        const availableEventTypes = this.getAvailableEventTypes();

        return availableEventTypes.map((type, i) => ({
            event: type.event,
            icon: type.icon,
            name: type.name,
            divider: needDivider(type, availableEventTypes[i - 1]),
            isSelected: !excludedEvents.includes(type.event)
        }));
    }

    @action
    toggleEventType(eventType) {
        const newExcludedEvents = toggleEventType(eventType, this.eventTypes);
        this.args.onChange(newExcludedEvents || null);
    }
}
