import Helper from '@ember/component/helper';
import {inject as service} from '@ember/service';

export default class ParseAuditLogEvent extends Helper {
    @service store;

    compute([ev]) {
        const action = getAction(ev);
        const actionIcon = getActionIcon(ev);
        const getActor = () => this.store.findRecord(ev.actor_type, ev.actor_id, {reload: false});
        const getResource = () => this.store.findRecord(ev.resource_type, ev.resource_id, {reload: false});
        const contextResource = getContextResource(ev);

        const linkable = ['page', 'post'].includes(ev.resource_type) && ev.event !== 'deleted';

        return {
            get actor() {
                return getActor();
            },
            get resource() {
                return getResource();
            },
            contextResource,
            linkable,
            actionIcon,
            action,
            original: ev
        };
    }
}

function getActionIcon(ev) {
    switch (ev.event) {
    case 'added':
        return 'add';
    case 'edited':
        return 'pen';
    case 'deleted':
        return 'trash';
    }

    return 'info';
}

function getAction(ev) {
    let resourceType = ev.resource_type;

    if (resourceType === 'api_key') {
        resourceType = 'API key';
    } else if (resourceType === 'setting') {
        resourceType = 'settings';
    }

    return `${ev.event} ${resourceType}`;
}

function getContextResource(ev) {
    if (ev.resource_type === 'setting') {
        if (ev.context?.group && ev.context?.key) {
            return {
                first: ev.context.group,
                second: ev.context.key
            };
        }
    }

    return null;
}
