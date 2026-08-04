import type {
    RouteSettings,
    Route,
    ChannelRoute,
    TemplateRoute,
    CollectionConfig
} from '@tryghost/adapter-base-route-settings';

/**
 * Routes and collections now reach RouterManager as their domain types —
 * `data` is passed through untouched and resolved to API calls at the request
 * boundary by the api adapter, and permalinks stay in `{slug}` form for the
 * permalink adapter to convert at mount time.
 *
 * All that is left of the bridge is flattening the taxonomies map into entries
 * that carry their own key. It goes away entirely in HKG-1898.
 */

// Taxonomies have no direct domain counterpart to derive from: the domain stores
// them as a `{tag, author}` map, which the bridge flattens into these
// `{key, permalink}` entries.
interface RouterTaxonomy {
    key: string;
    permalink: string;
}

export interface RouterSettings {
    routes: Route[];
    collections: CollectionConfig[];
    taxonomies: RouterTaxonomy[];
}

function buildRouterRoute(route: Route): Route {
    // Build per branch: Route is a discriminated union, so each member is
    // constructed as its concrete type. `route` is narrowed by the check.
    if (route.type === 'channel') {
        const result: ChannelRoute = {
            path: route.path,
            type: 'channel',
            templates: route.templates || []
        };
        if (route.data !== undefined) {
            result.data = route.data;
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

    const result: TemplateRoute = {
        path: route.path,
        type: 'template',
        templates: route.templates || []
    };
    if (route.data !== undefined) {
        result.data = route.data;
    }
    if (route.contentType !== undefined) {
        result.contentType = route.contentType;
    }
    return result;
}

function buildRouterCollection(collection: CollectionConfig): CollectionConfig {
    const result: CollectionConfig = {
        path: collection.path,
        permalink: collection.permalink,
        templates: collection.templates || []
    };

    if (collection.data !== undefined) {
        result.data = collection.data;
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
 * RouterManager.start() iterates. Taxonomies become `{key, permalink}` entries
 * so the routing layer no longer reads keys from a map.
 *
 * Temporary adapter: removed in HKG-1898 once the routers consume the domain
 * model directly.
 */
export function buildRouterSettings(settings: RouteSettings): RouterSettings {
    const taxonomies: RouterTaxonomy[] = [];
    for (const [key, value] of Object.entries(settings.taxonomies)) {
        if (value) {
            taxonomies.push({key, permalink: value});
        }
    }

    return {
        routes: settings.routes.map(buildRouterRoute),
        collections: settings.collections.map(buildRouterCollection),
        taxonomies
    };
}
