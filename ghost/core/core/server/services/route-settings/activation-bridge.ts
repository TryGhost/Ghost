import _ from 'lodash';
import errors from '@tryghost/errors';
import {QUERY} from '../../../frontend/services/routing/config';
import type {
    RouteSettings,
    Route,
    ChannelRoute,
    TemplateRoute,
    CollectionConfig,
    RouteData,
    DataShortForm,
    DataShortFormResource,
    DataReadEntry,
    DataBrowseEntry
} from '@tryghost/adapter-base-route-settings';

interface ExpandedData {
    query: Record<string, any>;
    router: Record<string, any[]>;
}

function expandShortFormData(shortForm: DataShortForm, resourceKey?: string): ExpandedData {

    const [key, slug] = shortForm.split('.') as [DataShortFormResource, string];
    const queryConfig = QUERY[key];

    const data: ExpandedData = {
        query: {},
        router: {}
    };

    const effectiveKey = resourceKey || key;
    data.query[effectiveKey] = _.cloneDeep(queryConfig);
    data.query[effectiveKey].options.slug = slug;

    const routerKey = queryConfig.resource;
    data.router[routerKey] = [{slug, redirect: true}];

    return data;
}

function expandLongFormEntry(key: string, entry: DataReadEntry | DataBrowseEntry): ExpandedData {
    const defaultResource = Object.values(QUERY).find(item => item.resource === entry.resource);

    if (!defaultResource) {
        throw new errors.IncorrectUsageError({message: `Unknown route data resource: ${entry.resource}`});
    }

    const data: ExpandedData = {
        query: {},
        router: {}
    };

    data.query[key] = {
        type: entry.type,
        resource: defaultResource.resource
    };

    data.query[key] = _.defaults(data.query[key], _.omit(defaultResource, 'options'));

    const allowedQueryOptions = ['limit', 'order', 'filter', 'include', 'slug', 'visibility', 'status', 'page'];
    data.query[key].options = _.pick(entry, allowedQueryOptions);

    if (entry.type === 'read') {
        const defaultOptions = 'options' in defaultResource ? defaultResource.options : undefined;
        data.query[key].options = _.defaults(data.query[key].options, defaultOptions);
    }

    const routerKey = defaultResource.resource;
    if (!data.router[routerKey]) {
        data.router[routerKey] = [];
    }

    if (entry.type === 'read') {
        const allowedRouterOptions = ['redirect', 'slug'];
        let routerEntry = _.pick(entry, allowedRouterOptions);
        routerEntry = _.defaults(routerEntry, {redirect: true});
        data.router[routerKey].push(routerEntry);
    } else {
        data.router[routerKey].push({redirect: true});
    }

    return data;
}

function expandRouteData(routeData: RouteData | undefined): ExpandedData {
    if (!routeData) {
        return {query: {}, router: {}};
    }

    if (typeof routeData === 'string') {
        return expandShortFormData(routeData);
    }

    const merged: ExpandedData = {query: {}, router: {}};

    for (const [key, entry] of Object.entries(routeData)) {
        let expanded: ExpandedData;

        if (typeof entry === 'string') {
            expanded = expandShortFormData(entry, key);
        } else {
            expanded = expandLongFormEntry(key, entry);
        }

        _.merge(merged.query, expanded.query);

        for (const [routerKey, routerEntries] of Object.entries(expanded.router)) {
            if (merged.router[routerKey]) {
                merged.router[routerKey] = merged.router[routerKey].concat(routerEntries);
            } else {
                merged.router[routerKey] = routerEntries;
            }
        }
    }

    return merged;
}

function convertSlugsToColons(value: string): string {
    return value.replace(/{(\w+)}/g, ':$1');
}

function expandRoute(route: Route): Record<string, any> {
    const expanded: Record<string, any> = {};

    expanded.templates = route.templates || [];

    if (route.data !== undefined) {
        expanded.data = expandRouteData(route.data);
    }

    if (route.type === 'channel') {
        const channel = route as ChannelRoute;
        expanded.controller = 'channel';
        if (channel.filter !== undefined) {
            expanded.filter = channel.filter;
        }
        if (channel.order !== undefined) {
            expanded.order = channel.order;
        }
        if (channel.limit !== undefined) {
            expanded.limit = channel.limit;
        }
        if (channel.rss !== undefined) {
            expanded.rss = channel.rss;
        }
    } else {
        const template = route as TemplateRoute;
        if (template.contentType !== undefined) {
            expanded.content_type = template.contentType;
        }
    }

    return expanded;
}

function expandCollection(collection: CollectionConfig): Record<string, any> {
    const expanded: Record<string, any> = {};

    expanded.permalink = convertSlugsToColons(collection.permalink);
    expanded.templates = collection.templates || [];

    if (collection.data !== undefined) {
        expanded.data = expandRouteData(collection.data);
    }

    if (collection.filter !== undefined) {
        expanded.filter = collection.filter;
    }
    if (collection.order !== undefined) {
        expanded.order = collection.order;
    }
    if (collection.limit !== undefined) {
        expanded.limit = collection.limit;
    }
    if (collection.rss !== undefined) {
        expanded.rss = collection.rss;
    }

    return expanded;
}

/**
 * Converts a RouteSettings domain model into the legacy expanded format
 * that routerManager.start() expects.
 *
 * This is a temporary adapter — it gets removed once RouterManager is
 * refactored to consume the domain model directly (HKG-1895/HKG-1898).
 */
export function expandRouteSettings(settings: RouteSettings): {routes: Record<string, any>; collections: Record<string, any>; taxonomies: Record<string, string>} {
    const routes: Record<string, any> = {};
    for (const route of settings.routes) {
        routes[route.path] = expandRoute(route);
    }

    const collections: Record<string, any> = {};
    for (const collection of settings.collections) {
        collections[collection.path] = expandCollection(collection);
    }

    const taxonomies: Record<string, string> = {};
    for (const [key, value] of Object.entries(settings.taxonomies)) {
        if (value) {
            taxonomies[key] = convertSlugsToColons(value);
        }
    }

    return {routes, collections, taxonomies};
}
