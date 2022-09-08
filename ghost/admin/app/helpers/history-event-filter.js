import Helper from '@ember/component/helper';
import classic from 'ember-classic-decorator';
import {isBlank} from '@ember/utils';

@classic
export default class HistoryEventFilter extends Helper {
    compute(
        positionalParams,
        {excludedEvents = [], excludedResources = [], user = ''}
    ) {
        const excludedEventsSet = new Set();
        const excludedResourcesSet = new Set();

        if (excludedEvents.length) {
            excludedEvents.forEach(type => excludedEventsSet.add(type));
        }

        if (excludedResources.length) {
            excludedResources.forEach(type => excludedResourcesSet.add(type));
        }

        let filterParts = [];

        const excludedEventsArray = Array.from(excludedEventsSet).reject(isBlank);
        if (excludedEventsArray.length > 0) {
            filterParts.push(`event:-[${excludedEventsArray.join(',')}]`);
        }

        const IGNORED_RESOURCES = ['label'];
        const excludedResourcesArray = Array.from(excludedResourcesSet).concat(IGNORED_RESOURCES).reject(isBlank);
        if (excludedResourcesArray.length > 0) {
            filterParts.push(`resource_type:-[${excludedResourcesArray.join(',')}]`);
        }

        if (user) {
            filterParts.push(`actor_id:${user}`);
        }

        return filterParts.join('+');
    }
}
