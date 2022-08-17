import Helper from '@ember/component/helper';
import {inject as service} from '@ember/service';

export default class ParseAuditLogEvent extends Helper {
    @service store;

    compute([ev]) {
        const action = getAction(ev);
        const actionIcon = getActionIcon(ev);
        const getActor = () => this.store.findRecord('user', ev.actor_id, {reload: false});

        return {
            get actor() {
                return getActor();
            },
            actionIcon,
            action,
            original: ev
        };
    }
}

function getActionIcon(ev) {
    switch (ev.event) {
    case 'added':
        return 'add-stroke';
    case 'edited':
        return 'content';
    case 'deleted':
        return 'cross-circle';
    }
}

function getAction(ev) {
    return `${ev.event} ${ev.resource_type}`;
}
