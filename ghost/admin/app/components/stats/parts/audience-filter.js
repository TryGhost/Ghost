import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export const AUDIENCE_TYPES = [
    {name: 'Logged out visitors', value: 'undefined'},
    {name: 'Free members', value: 'free'},
    {name: 'Paid members', value: 'paid'}
];

function toggleAudienceType(audicenceType, audicenceTypes) {
    const excludedAudiences = new Set(audicenceTypes.filter(type => !type.isSelected).map(type => type.value));
    if (excludedAudiences.has(audicenceType)) {
        excludedAudiences.delete(audicenceType);
    } else {
        excludedAudiences.add(audicenceType);
    }
    return Array.from(excludedAudiences).join(',');
}

export default class MembersActivityEventTypeFilter extends Component {
    @service settings;
    @service feature;

    get audienceTypes() {
        const excludedAudiences = (this.args.excludedAudiences || '').split(',');
        const availableAudiences = AUDIENCE_TYPES;

        return availableAudiences.map(type => ({
            name: type.name,
            value: type.value,
            isSelected: !excludedAudiences.includes(type.value)
        }));
    }

    @action
    toggleAudienceType(audicenceType) {
        const newExcludedAudiences = toggleAudienceType(audicenceType, this.audienceTypes);
        this.args.onChange(newExcludedAudiences || null);
    }
}
