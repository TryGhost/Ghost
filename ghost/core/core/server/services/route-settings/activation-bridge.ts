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

/**
 * Router-facing shapes. RouterManager consumes the domain model after the two
 * conversions the bridge still applies: `data` expanded to `{query, router}`,
 * and collection/taxonomy permalinks rewritten to `:slug`.
 *
 * Routes and collections are written as their domain counterpart with just
 * `data` overridden to the expanded shape — `Omit<…, 'data'> & {data?}` rather
 * than `extends`, because the override changes `data`'s type (interface
 * extension can only add fields, not retype them). That keeps the delta from
 * the domain model explicit: `data` is the only structural difference. When the
 * bridge is removed (HKG-1898) the override falls away and these collapse back
 * to `Route` / `CollectionConfig`.
 */
type RouterChannelRoute = Omit<ChannelRoute, 'data'> & {data?: ExpandedData};
type RouterTemplateRoute = Omit<TemplateRoute, 'data'> & {data?: ExpandedData};
type RouterRoute = RouterChannelRoute | RouterTemplateRoute;

type RouterCollection = Omit<CollectionConfig, 'data'> & {data?: ExpandedData};

// Taxonomies and RouteSettings have no direct domain counterpart to derive from:
// the domain stores taxonomies as a `{tag, author}` map, which the bridge
// flattens into these `{key, permalink}` entries, and RouterSettings drops
// `yamlSource` and swaps all three array element types (routes, collections,
// taxonomies) — so they stay standalone.
interface RouterTaxonomy {
    key: string;
    permalink: string;
}

export interface RouterSettings {
    routes: RouterRoute[];
    collections: RouterCollection[];
    taxonomies: RouterTaxonomy[];
}

function buildRouterRoute(route: Route): RouterRoute {
    const data = route.data !== undefined ? expandRouteData(route.data) : undefined;

    // Build per branch: RouterRoute is a discriminated union, so each member is
    // constructed as its concrete type. `route` is narrowed by the check.
    if (route.type === 'channel') {
        const result: RouterChannelRoute = {
            path: route.path,
            type: 'channel',
            templates: route.templates || []
        };
        if (data !== undefined) {
            result.data = data;
        }
        if (route.filter !== undefined) {
            result.filter = route.filter;
        }
        if (route.order !== undefined) {
            result.order = route.order;
        }
        if (route.limit !== undefined) {
            result.limit = route.limit;
        }
        if (route.rss !== undefined) {
            result.rss = route.rss;
        }
        return result;
    }

    const result: RouterTemplateRoute = {
        path: route.path,
        type: 'template',
        templates: route.templates || []
    };
    if (data !== undefined) {
        result.data = data;
    }
    if (route.contentType !== undefined) {
        result.contentType = route.contentType;
    }
    return result;
}

function buildRouterCollection(collection: CollectionConfig): RouterCollection {
    const result: RouterCollection = {
        path: collection.path,
        permalink: convertSlugsToColons(collection.permalink),
        templates: collection.templates || []
    };

    if (collection.data !== undefined) {
        result.data = expandRouteData(collection.data);
    }
    if (collection.filter !== undefined) {
        result.filter = collection.filter;
    }
    if (collection.order !== undefined) {
        result.order = collection.order;
    }
    if (collection.limit !== undefined) {
        result.limit = collection.limit;
    }
    if (collection.rss !== undefined) {
        result.rss = collection.rss;
    }

    return result;
}

/**
 * Converts a RouteSettings domain model into the array shape that
 * RouterManager.start() iterates. Each route/collection carries its own `path`,
 * and taxonomies become `{key, permalink}` entries, so the routing layer no
 * longer reads paths from map keys.
 *
 * Temporary adapter: removed in HKG-1898 once the routers consume the domain
 * model directly.
 */
export function buildRouterSettings(settings: RouteSettings): RouterSettings {
    const taxonomies: RouterTaxonomy[] = [];
    for (const [key, value] of Object.entries(settings.taxonomies)) {
        if (value) {
            taxonomies.push({key, permalink: convertSlugsToColons(value)});
        }
    }

    return {
        routes: settings.routes.map(buildRouterRoute),
        collections: settings.collections.map(buildRouterCollection),
        taxonomies
    };
}
