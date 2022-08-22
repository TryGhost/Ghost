import Helper from '@ember/component/helper';
import classic from 'ember-classic-decorator';
import {isBlank} from '@ember/utils';
import {inject as service} from '@ember/service';

@classic
export default class AuditLogEventFilter extends Helper {
    @service settings;
    @service feature;

    compute(
        positionalParams,
        {excludedEvents = [], user = ''}
    ) {
        const excludedEventsSet = new Set();

        if (excludedEvents.length) {
            excludedEvents.forEach(type => excludedEventsSet.add(type));
        }

        let filterParts = [];

        const excludedEventsArray = Array.from(excludedEventsSet).reject(isBlank);
        if (excludedEventsArray.length > 0) {
            filterParts.push(`resource_type:-[${excludedEventsArray.join(',')}]`);
        }

        if (user) {
            filterParts.push(`actor_id:${user}`);
        }

        return filterParts.join('+');
    }
}
