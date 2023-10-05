import Helper from '@ember/component/helper';
import config from 'ghost-admin/config/environment';
import {inject as service} from '@ember/service';

export default class ParseHistoryEvent extends Helper {
    @service ghostPaths;

    compute([ev]) {
        const action = getAction(ev);
        const actionIcon = getActionIcon(ev);
        const contextResource = getContextResource(ev);
        const linkTarget = getLinkTarget(ev);

        const actor = getActor(ev);
        const actorLinkTarget = getActorLinkTarget(ev);

        const assetRoot = (config.cdnUrl ? '' : this.ghostPaths.assetRoot.replace(/\/$/, ''));
        const actorIcon = getActorIcon(ev, assetRoot);

        return {
            contextResource,
            linkTarget,
            actionIcon,
            action,
            actor,
            actorIcon,
            actorLinkTarget,
            original: ev,
            isBulkAction: !!ev.context.count
        };
    }
}

function getActor(ev) {
    if (!ev.actor.id) {
        return null;
    }

    return ev.actor;
}

function getActorIcon(ev, assetRoot) {
    const defaultImage = `/img/user-image.png`;
    let defaultImageUrl = `${assetRoot}${defaultImage}`;

    if (!ev.actor.id || !ev.actor.image) {
        return defaultImageUrl;
    }

    return ev.actor.image;
}

function getActorLinkTarget(ev) {
    const actor = getActor(ev);
    if (!actor) {
        return null;
    }

    switch (ev.actor_type) {
    case 'integration':
        if (!actor.id) {
            return null;
        }

        return {
            route: 'settings.integration',
            models: [actor.id]
        };
    case 'user':
        if (!actor.slug) {
            return null;
        }

        return {
            route: 'settings.staff.user',
            models: [actor.slug]
        };
    }

    return null;
}

function getLinkTarget(ev) {
    let resourceType = ev.resource_type;

    if (ev.event !== 'deleted') {
        switch (ev.resource_type) {
        case 'page':
        case 'post':
            if (!ev.resource || !ev.resource.id) {
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
            if (!ev.resource || !ev.resource.id) {
                return null;
            }

            return {
                route: 'settings.integration',
                models: [ev.resource.id]
            };
        case 'offer':
            if (!ev.resource || !ev.resource.id) {
                return null;
            }

            return {
                route: 'offer',
                models: [ev.resource.id]
            };
        case 'tag':
            if (!ev.resource || !ev.resource.slug) {
                return null;
            }

            return {
                route: 'tag',
                models: [ev.resource.slug]
            };
        case 'product':
            return {
                route: 'settings.membership',
                models: null
            };
        case 'user':
            if (!ev.resource || !ev.resource.slug) {
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
        return 'plus-large';
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
    } else if (resourceType === 'product') {
        resourceType = 'tier';
    }

    // Because a `page` and `post` both use the same model, we store the
    // actual type in the context, so let's check if that exists
    if (resourceType === 'post') {
        if (ev.context?.type) {
            resourceType = ev.context?.type;
        }
    }

    let action = ev.event;

    if (ev.event === 'edited') {
        if (ev.context.action_name) {
            action = ev.context.action_name;
        }
    }

    if (ev.context.count && ev.context.count > 1) {
        return `${ev.context.count} ${resourceType}s ${action}`;
    }

    return `${resourceType} ${action}`;
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
