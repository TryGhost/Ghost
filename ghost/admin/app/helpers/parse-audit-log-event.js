import Helper from '@ember/component/helper';
import {inject as service} from '@ember/service';

export default class ParseAuditLogEvent extends Helper {
    @service store;

    compute([ev]) {
        const action = getAction(ev);
        const actionIcon = getActionIcon(ev);
        const getActor = () => this.store.findRecord(ev.actor_type, ev.actor_id, {reload: false});
        const contextResource = getContextResource(ev);
        const linkTarget = getLinkTarget(ev);

        return {
            get actor() {
                return getActor();
            },
            contextResource,
            linkTarget,
            actionIcon,
            action,
            original: ev
        };
    }
}

function getLinkTarget(ev) {
    let resourceType = ev.resource_type;

    if (ev.event !== 'deleted') {
        switch (ev.resource_type) {
        case 'page':
        case 'post':
            if (!ev.resource.id) {
                return null;
            }

            if (resourceType === 'post') {
                if (ev.context?.type) {
                    resourceType = ev.context?.type;
                }
            }

            return {
                route: 'editor.edit',
                models: [resourceType, ev.resource.id]
            };
        case 'integration':
            if (!ev.resource.id) {
                return null;
            }

            return {
                route: 'settings.integration',
                models: [ev.resource.id]
            };
        case 'offer':
            if (!ev.resource.id) {
                return null;
            }

            return {
                route: 'offer',
                models: [ev.resource.id]
            };
        case 'tag':
            if (!ev.resource.slug) {
                return null;
            }

            return {
                route: 'tag',
                models: [ev.resource.slug]
            };
        case 'user':
            if (!ev.resource.slug) {
                return null;
            }

            return {
                route: 'settings.staff.user',
                models: [ev.resource.slug]
            };
        }
    }

    return null;
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

    // Because a `page` and `post` both use the same model, we store the
    // actual type in the context, so let's check if that exists
    if (resourceType === 'post') {
        if (ev.context?.type) {
            resourceType = ev.context?.type;
        }
    }

    return `${resourceType} ${ev.event}`;
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
