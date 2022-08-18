import Helper from '@ember/component/helper';
import {inject as service} from '@ember/service';

export default class ParseAuditLogEvent extends Helper {
    @service store;

    compute([ev]) {
        const action = getAction(ev);
        const actionIcon = getActionIcon(ev);
        const getActor = () => this.store.findRecord(ev.actor_type, ev.actor_id, {reload: false});
        const getResource = () => this.store.findRecord(ev.resource_type, ev.resource_id, {reload: false});

        return {
            get actor() {
                return getActor();
            },
            get resource() {
                return getResource();
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

    return 'info';
}

function getAction(ev) {
    return `${ev.event} ${ev.resource_type}`;
}
