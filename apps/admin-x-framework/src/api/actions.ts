import {InfiniteData} from '@tanstack/react-query';
import {ExternalLink, InternalLink} from '../providers/RoutingProvider';
import {Meta, createInfiniteQuery} from '../utils/api/hooks';
import {JSONObject} from './config';

// Types

export type Action = {
    id: string;
    resource_id: string;
    resource_type: string;
    actor_id: string;
    actor_type: string;
    event: string;
    context: JSONObject;
    created_at: string;
    actor?: {
        id: string;
        name: string;
        slug: string;
        image: string|null;
    },
    resource?: {
        id: string;
        slug: string;
        name?: string;
        title?: string;
    }

    skip?: boolean
    count?: number
};

export interface ActionsResponseType {
    actions: Array<Omit<Action, 'context'> & {context: string}>;
    meta: Meta;
}

export interface ActionsList {
    actions: Action[];
    meta: Meta;
    isEnd: boolean;
}

// Requests

const dataType = 'ActionsResponseType';

export const useBrowseActions = createInfiniteQuery<ActionsList>({
    dataType,
    path: '/actions/',
    returnData: (originalData) => {
        const {pages} = originalData as InfiniteData<{
            actions: Array<Omit<Action, 'context'> & {context: string}>,
            meta: Meta
        }>;

        let actions = pages.flatMap(page => page.actions.map(
            ({context, ...action}) => ({...action, context: JSON.parse(context)})
        ));

        actions = actions.reverse();

        let count = 1;

        actions.forEach((action, index) => {
            const nextAction = actions[index + 1];

            // depending on the similarity, add additional properties to be used on the frontend for grouping
            // skip - used for hiding the event on the frontend
            // count - the number of similar events which is added to the last item
            if (nextAction && action.resource_id === nextAction.resource_id && action.event === nextAction.event) {
                action.skip = true;
                count += 1;
            } else if (count > 1) {
                action.count = count;
                count = 1;
            }
        });

        const meta = pages[pages.length - 1].meta;

        return {
            actions: actions.reverse(),
            meta,
            isEnd: meta ? meta.pagination.pages === meta.pagination.page : true
        };
    }
});

// Helpers

export const getActorLinkTarget = (action: Action): InternalLink | ExternalLink | undefined => {
    if (!action.actor) {
        return;
    }

    switch (action.actor_type) {
    case 'integration':
        if (!action.actor.id) {
            return;
        }

        return {route: `integrations/${action.actor.id}`};
    case 'user':
        if (!action.actor.slug) {
            return;
        }

        return {route: `staff/${action.actor.slug}`};
    }

    return;
};

export const getLinkTarget = (action: Action): InternalLink | ExternalLink | undefined => {
    let resourceType = action.resource_type;

    if (action.event !== 'deleted') {
        switch (action.resource_type) {
        case 'page':
        case 'post':
            if (!action.resource || !action.resource.id) {
                return;
            }

            if (resourceType === 'post') {
                if (action.context?.type) {
                    resourceType = action.context?.type as string;
                }
            }

            return {
                isExternal: true,
                route: `editor/${resourceType}/${action.resource.id}`,
                models: [resourceType, action.resource.id]
            };
        case 'integration':
            if (!action.resource || !action.resource.id) {
                return;
            }

            return {route: `integrations/${action.resource.id}`};
        case 'offer':
            if (!action.resource || !action.resource.id) {
                return;
            }
            // replace with Settings route once Offers X GA is released
            return {
                isExternal: true,
                route: `offers/${action.resource.id}`,
                models: [action.resource.id]
            };
        case 'tag':
            if (!action.resource || !action.resource.slug) {
                return;
            }

            return {
                isExternal: true,
                route: 'tag',
                models: [action.resource.slug]
            };
        case 'product':
            return {route: 'tiers'};
        case 'user':
            if (!action.resource || !action.resource.slug) {
                return;
            }

            return {route: `staff/${action.resource.slug}`};
        }
    }

    return;
};

export const getActionTitle = (action: Action) => {
    let resourceType = action.resource_type;

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
        if (action.context?.type) {
            resourceType = action.context?.type as string;
        }
    }

    let actionName = action.event;

    if (action.event === 'edited') {
        if (action.context?.action_name) {
            actionName = action.context?.action_name as string;
        }
    }

    if (action.context?.count && (action.context?.count as number) > 1) {
        return `${action.context?.count} ${resourceType}s ${actionName}`;
    }

    return `${resourceType.slice(0, 1).toUpperCase()}${resourceType.slice(1)} ${actionName}`;
};

export const getContextResource = (action: Action) => {
    if (action.resource_type === 'setting') {
        if (action.context?.group && action.context?.key) {
            return {
                group: action.context?.group as string,
                key: action.context?.key as string
            };
        }
    }
};

export const isBulkAction = (action: Action) => typeof action.context?.count === 'number' && action.context?.count > 1;
