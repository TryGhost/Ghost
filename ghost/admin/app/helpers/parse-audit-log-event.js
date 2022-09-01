import Helper from '@ember/component/helper';
import {inject as service} from '@ember/service';

export default class ParseAuditLogEvent extends Helper {
    @service ghostPaths;

    compute([ev]) {
        const action = getAction(ev);
        const actionIcon = getActionIcon(ev);
        const contextResource = getContextResource(ev);
        const linkTarget = getLinkTarget(ev);

        const actor = getActor(ev);
        const actorLinkTarget = getActorLinkTarget(ev);

        const assetRoot = this.ghostPaths.assetRoot.replace(/\/$/, '');
        const actorIcon = getActorIcon(ev, assetRoot);

        return {
            contextResource,
            linkTarget,
            actionIcon,
            action,
            actor,
            actorIcon,
            actorLinkTarget,
            original: ev
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
    const defaultImage = `${assetRoot}/img/user-image.png`;

    if (!ev.actor.id) {
        return defaultImage;
    }

    if (!ev.actor.image) {
        return defaultImage;
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
