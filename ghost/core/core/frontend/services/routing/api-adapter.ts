import _ from 'lodash';
import errors from '@tryghost/errors';
import {QUERY} from './config';
import type {RouteData, DataEntry, DataShortForm, DataLongFormEntry} from '@tryghost/adapter-base-route-settings';

/**
 * A resolved Content API call: which controller to reach for, which method to
 * call on it, and the options to call it with.
 */
export interface ApiCallSpec {
    controller: string;
    type: 'read' | 'browse';
    resource: string;
    options: Record<string, unknown>;
}

/**
 * The resource read that a data entry claims — the router that declares it owns
 * that slug, and other routers redirect to it.
 */
export interface ResourceRead {
    resource: string;
    slug: string;
}

interface ResourceConfig {
    controller: string;
    type?: 'read' | 'browse';
    resource: string;
    options?: Record<string, unknown>;
}

/**
 * Not every entry in QUERY is reachable from route data — `previews` and `email`
 * are internal routers with no `type`, so they resolve to no API call.
 */
const RESOURCE_CONFIGS: Record<string, ResourceConfig | undefined> = QUERY;

/**
 * The entry fields the Content API accepts as query options. Everything else on
 * a data entry is routing metadata (`redirect`) or unsupported (`fields`), and
 * is deliberately not forwarded.
 */
const ALLOWED_QUERY_OPTIONS = ['limit', 'order', 'filter', 'include', 'slug', 'visibility', 'status', 'page'];

function unknownResource(resource: string) {
    return new errors.IncorrectUsageError({message: `Unknown route data resource: ${resource}`});
}

// Shorthand names a resource the short way (`tag`), long form the way the API
// does (`tags`). Both land on the same config.
function splitShortForm(shortForm: DataShortForm): [string, string] {
    const [key, slug] = shortForm.split('.');
    return [key, slug];
}

function shortFormConfig(key: string): ResourceConfig | undefined {
    return RESOURCE_CONFIGS[key];
}

function longFormConfig(resource: string): ResourceConfig | undefined {
    return Object.values(RESOURCE_CONFIGS).find(config => config?.resource === resource);
}

function resolveShortForm(shortForm: DataShortForm): ApiCallSpec {
    const [key, slug] = splitShortForm(shortForm);
    const config = shortFormConfig(key);

    if (!config?.type) {
        throw unknownResource(key);
    }

    return {
        controller: config.controller,
        type: config.type,
        resource: config.resource,
        options: {...config.options, slug}
    };
}

function resolveLongForm(entry: DataLongFormEntry): ApiCallSpec {
    const config = longFormConfig(entry.resource);

    if (!config) {
        throw unknownResource(entry.resource);
    }

    const options: Record<string, unknown> = _.pick(entry, ALLOWED_QUERY_OPTIONS);

    return {
        controller: config.controller,
        type: entry.type,
        resource: config.resource,
        // A `read` targets one known resource, so the resource defaults (e.g.
        // `visibility: public` for tags) apply. A `browse` is author-driven and
        // takes only what the entry asked for.
        options: entry.type === 'read' ? _.defaults(options, config.options) : options
    };
}

/**
 * Resolve a single route data entry into a Content API call.
 *
 * This is the one place that knows how a domain `resource` maps onto a Ghost API
 * controller — routes.yaml talks about `tags`, the API is reached via
 * `tagsPublic`. Callers work with the domain model and never name a controller.
 *
 * @example resolveApiCall('tag.food')
 *   // => {controller: 'tagsPublic', type: 'read', resource: 'tags', options: {slug: 'food', visibility: 'public'}}
 */
export function resolveApiCall(entry: DataEntry): ApiCallSpec {
    return typeof entry === 'string' ? resolveShortForm(entry) : resolveLongForm(entry);
}

/**
 * Resolve a route's whole `data` block, keyed the way the theme sees it.
 *
 * Top-level shorthand (`data: tag.food`) has no author-given name, so it is
 * keyed by its resource shorthand — `tag` — matching what themes already expect.
 */
export function resolveRouteData(routeData?: RouteData): Record<string, ApiCallSpec> {
    if (!routeData) {
        return {};
    }

    if (typeof routeData === 'string') {
        const [key] = splitShortForm(routeData);

        return {[key]: resolveApiCall(routeData)};
    }

    return _.mapValues(routeData, entry => resolveApiCall(entry));
}

/**
 * The resource read a data entry claims, or `null` if it claims none.
 *
 * Only a `read` names a single resource; a `browse` pulls a set and claims
 * nothing. Unlike {@link resolveApiCall} this answers a routing question, so an
 * entry it cannot make sense of is simply not a claim rather than an error.
 *
 * @example resolveResourceRead('tag.food') // => {resource: 'tags', slug: 'food'}
 */
export function resolveResourceRead(entry: DataEntry): ResourceRead | null {
    if (typeof entry === 'string') {
        const [key, slug] = splitShortForm(entry);
        const config = shortFormConfig(key);

        return config?.type === 'read' ? {resource: config.resource, slug} : null;
    }

    if (entry.type !== 'read') {
        return null;
    }

    return longFormConfig(entry.resource) ? {resource: entry.resource, slug: entry.slug} : null;
}
