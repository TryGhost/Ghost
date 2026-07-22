import yaml from 'js-yaml';
import type {
    ChannelRoute,
    CollectionConfig,
    DataEntry,
    DataShortForm,
    Route,
    RouteData,
    RouteSettings,
    TaxonomyConfig,
    TemplateRoute
} from '@tryghost/adapter-base-route-settings';
import {z} from 'zod';
import tpl from '@tryghost/tpl';
import type {PathSegment} from './validation-errors';
import {describeValue, formatLocation, humanList, toValidationError, validationError} from './validation-errors';

const messages = {
    badDataError: '"{key}" is a reserved key. Please wrap the data definition into a custom name.',
    badDataHelp: 'Example:\n data:\n  my-tag:\n    resource: tags\n    ...\n',
    authorDeprecatedError: '"author" is reserved. Please choose a different name. We recommend not using author.'
};

const VALID_SHORTFORM_RESOURCES = ['tag', 'page', 'post', 'author'] as const;
const VALID_LONGFORM_RESOURCES = ['tags', 'posts', 'pages', 'authors'] as const;
const RESERVED_DATA_KEYS = ['resource', 'type', 'limit', 'order', 'include', 'filter', 'status', 'visibility', 'slug', 'redirect'];

// YAML parses a bare `filter:` as null and authors commonly quote numeric scalars
// (`limit: "100"`); the legacy validator accepted both, so treat an explicitly empty
// value as unset and coerce digit-only limit strings to numbers.
const OptionalStringField = z.string().nullish().transform(v => v ?? undefined);
const OptionalBooleanField = z.boolean().nullish().transform(v => v ?? undefined);
const LimitField = z.union([z.number(), z.literal('all'), z.string().regex(/^\d+$/).transform(Number)])
    .nullish().transform(v => v ?? undefined);

const SHORTFORM_HELP = 'e.g. data: tag.recipes';

/**
 * Shorthand data definitions look like `tag.recipes` — resource, dot, slug.
 *
 * `%s` stands in for the slug: on channel routes and collections, fetch-data
 * substitutes it with the request's `slug` param at query time, which is how a
 * wildcard route such as `/author/:slug/` serves a different author per request.
 * There is no static slug that could replace it, so rejecting it would break
 * those routes.
 */
function validateDataShortForm(value: string, path: PathSegment[]): void {
    if (!/^[a-zA-Z0-9_]+\.(?:%s|[a-zA-Z0-9_-]+)$/.test(value)) {
        throw validationError(
            formatLocation(path),
            `"${value}" is not a valid data shorthand. Please use resource.slug, e.g. tag.recipes.`,
            SHORTFORM_HELP
        );
    }

    const resource = value.split('.')[0];
    if (!(VALID_SHORTFORM_RESOURCES as readonly string[]).includes(resource)) {
        throw validationError(
            formatLocation(path),
            `resource "${resource}" is not supported. Please use ${humanList(VALID_SHORTFORM_RESOURCES)}.`,
            SHORTFORM_HELP
        );
    }
}

const DataReadEntrySchema = z.object({
    type: z.literal('read'),
    resource: z.enum(VALID_LONGFORM_RESOURCES),
    slug: z.string().min(1),
    redirect: z.boolean().optional(),
    include: z.string().optional(),
    visibility: z.string().optional(),
    status: z.string().optional()
});

const DataBrowseEntrySchema = z.object({
    type: z.literal('browse'),
    resource: z.enum(VALID_LONGFORM_RESOURCES),
    filter: OptionalStringField,
    limit: LimitField,
    order: OptionalStringField,
    include: OptionalStringField,
    fields: OptionalStringField,
    visibility: OptionalStringField,
    status: OptionalStringField,
    page: z.number().optional()
});

const DataLongFormEntrySchema = z.discriminatedUnion('type', [DataReadEntrySchema, DataBrowseEntrySchema]);

const DATA_ENTRY_HELP = 'e.g.\n data:\n  my-tag:\n    resource: tags\n    type: read\n    slug: recipes\n';

function parseDataEntry(value: unknown, path: PathSegment[]): DataEntry {
    if (typeof value === 'string') {
        validateDataShortForm(value, path);
        return value as DataShortForm;
    }

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const result = DataLongFormEntrySchema.safeParse(value);
        if (!result.success) {
            const issue = result.error.issues[0];
            const at = formatLocation(path);
            const record = value as Record<string, unknown>;

            // A failed `type` discriminator surfaces as a union issue on that
            // key — matched on the code rather than the wording, which zod
            // is free to change.
            if (issue.code === 'invalid_union' && issue.path[0] === 'type') {
                if (record.type === undefined) {
                    throw validationError(at, 'type is required. Please use read or browse.', DATA_ENTRY_HELP);
                }
                throw validationError(at, `type "${record.type}" is not supported. Please use read or browse.`, DATA_ENTRY_HELP);
            }
            if (issue.path.includes('resource')) {
                if (record.resource === undefined) {
                    throw validationError(at, `resource is required. Please use ${humanList(VALID_LONGFORM_RESOURCES)}.`, DATA_ENTRY_HELP);
                }
                throw validationError(at, `resource "${record.resource}" is not supported. Please use ${humanList(VALID_LONGFORM_RESOURCES)}.`, DATA_ENTRY_HELP);
            }
            if (issue.path.includes('slug') && !record.slug) {
                throw validationError(at, 'slug is required for read data entries.', DATA_ENTRY_HELP);
            }
            throw toValidationError(result.error, path, value);
        }
        // Fields set to an explicitly empty value parse to undefined — drop the
        // keys so "unset" means absent in the domain model and serialized output.
        const entry: Record<string, unknown> = result.data;
        for (const entryKey of Object.keys(entry)) {
            if (entry[entryKey] === undefined) {
                delete entry[entryKey];
            }
        }
        return result.data;
    }

    throw validationError(
        formatLocation(path),
        `a data entry must be a shorthand like tag.recipes, or a map with type and resource, but ${describeValue(value)} was provided.`,
        DATA_ENTRY_HELP
    );
}

function parseRouteData(data: unknown, path: PathSegment[]): RouteData {
    if (typeof data === 'string') {
        validateDataShortForm(data, path);
        return data as DataShortForm;
    }

    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        throw validationError(
            formatLocation(path),
            `data must be a shorthand like tag.recipes, or a map of named data entries, but ${describeValue(data)} was provided.`,
            DATA_ENTRY_HELP
        );
    }

    const record = data as Record<string, unknown>;

    for (const key of Object.keys(record)) {
        if (RESERVED_DATA_KEYS.includes(key)) {
            throw validationError(formatLocation([...path, key]), tpl(messages.badDataError, {key}), messages.badDataHelp);
        }
        if (key === 'author') {
            throw validationError(formatLocation([...path, key]), messages.authorDeprecatedError);
        }
    }

    const parsed: Record<string, DataEntry> = {};
    for (const [key, value] of Object.entries(record)) {
        parsed[key] = parseDataEntry(value, [...path, key]);
    }
    return parsed;
}

const TemplateField = z.union([z.string(), z.array(z.string())]).nullish().default([])
    .transform(v => {
        if (!v || (Array.isArray(v) && v.length === 0)) {
            return [];
        }
        return Array.isArray(v) ? v : [v];
    });

// The schemas are built per route/collection so that errors raised while
// parsing nested `data` can name the exact path they came from.
const routeObjectSchema = (path: PathSegment[]) => z.object({
    controller: z.literal('channel').optional(),
    template: TemplateField,
    data: z.unknown().optional(),
    content_type: OptionalStringField,
    filter: OptionalStringField,
    order: OptionalStringField,
    limit: LimitField,
    rss: OptionalBooleanField
}).transform((val): Omit<Route, 'path'> => {
    const templates = val.template;
    const data = val.data !== undefined ? parseRouteData(val.data, [...path, 'data']) : undefined;

    if (val.controller === 'channel') {
        const route: Omit<ChannelRoute, 'path'> = {
            type: 'channel',
            templates
        };
        // Preserve rss only when the author set it explicitly — the domain model
        // mirrors user intent (unset vs true vs false), so the activation bridge
        // reproduces validate.js output byte-for-byte.
        if (val.rss !== undefined) {
            route.rss = val.rss;
        }
        if (val.filter !== undefined) {
            route.filter = val.filter;
        }
        if (val.order !== undefined) {
            route.order = val.order;
        }
        if (val.limit !== undefined) {
            route.limit = val.limit;
        }
        if (data !== undefined) {
            route.data = data;
        }
        return route;
    }

    const route: Omit<TemplateRoute, 'path'> = {
        type: 'template',
        templates
    };
    if (val.content_type !== undefined) {
        route.contentType = val.content_type;
    }
    if (data !== undefined) {
        route.data = data;
    }
    return route;
});

const collectionValueSchema = (path: PathSegment[]) => z.object({
    permalink: z.string().optional(),
    template: TemplateField,
    data: z.unknown().optional(),
    filter: OptionalStringField,
    order: OptionalStringField,
    limit: LimitField,
    rss: OptionalBooleanField
}).transform((val): Omit<CollectionConfig, 'path'> => {
    const data = val.data !== undefined ? parseRouteData(val.data, [...path, 'data']) : undefined;
    const collection: Omit<CollectionConfig, 'path'> = {
        permalink: val.permalink ?? '',
        templates: val.template
    };
    if (val.filter !== undefined) {
        collection.filter = val.filter;
    }
    if (val.order !== undefined) {
        collection.order = val.order;
    }
    if (val.limit !== undefined) {
        collection.limit = val.limit;
    }
    if (val.rss !== undefined) {
        collection.rss = val.rss;
    }
    if (data !== undefined) {
        collection.data = data;
    }
    return collection;
});

const RouteSettingsSchema = z.object({
    routes: z.record(z.string(), z.unknown()).nullable().optional().default({}),
    collections: z.record(z.string(), z.unknown()).nullable().optional().default({}),
    taxonomies: z.record(z.string(), z.string()).nullable().optional().default({})
});

/**
 * Every path in routes.yaml — route paths, collection paths, permalinks and
 * taxonomy permalinks — follows the same rules, so they share one message set.
 *
 * `allowParamNotation` is set for route and collection keys, which are mounted on
 * Express verbatim: nothing rewrites `{param}` to `:param` for them the way it
 * does for permalinks and taxonomies. So `/author/:slug/` is a working wildcard
 * route on live sites and `/author/{slug}/` would be a dead literal path —
 * rejecting :param there would break the former, and the suggested rewrite would
 * silently produce the latter.
 */
function validatePath(value: string, path: PathSegment[], example: string, {allowParamNotation = false}: {allowParamNotation?: boolean} = {}): void {
    const at = formatLocation(path);

    if (!value.startsWith('/')) {
        throw validationError(at, `"${value}" is missing a leading slash. Please use e.g. ${example}.`);
    }
    if (!value.endsWith('/')) {
        throw validationError(at, `"${value}" is missing a trailing slash. Please use e.g. ${example}.`);
    }
    if (!allowParamNotation && /\/:\w+/.test(value)) {
        // Suggest the same path in the notation Ghost expects, rather than a
        // generic example the author then has to translate.
        throw validationError(at, `"${value}" uses the :param notation. Please use "${value.replace(/\/:(\w+)/g, '/{$1}')}".`);
    }
}

export function parseRouteSettings(raw: unknown, yamlSource: string): RouteSettings {
    const obj = raw ?? {};

    const parsed = RouteSettingsSchema.safeParse(obj);
    if (!parsed.success) {
        throw toValidationError(parsed.error, [], obj);
    }

    const {routes: rawRoutes, collections: rawCollections, taxonomies: rawTaxonomies} = parsed.data;

    const routes: Route[] = [];
    if (rawRoutes) {
        for (const [path, value] of Object.entries(rawRoutes)) {
            const routeLocation: PathSegment[] = ['routes', path];
            validatePath(path, routeLocation, '/about/', {allowParamNotation: true});

            if (value === null || value === undefined) {
                throw validationError(formatLocation(routeLocation), 'Please define a template, e.g. /about/: about.');
            }

            if (typeof value === 'string') {
                routes.push({type: 'template', path, templates: [value]});
                continue;
            }

            const routeResult = routeObjectSchema(routeLocation).safeParse(value);
            if (!routeResult.success) {
                throw toValidationError(routeResult.error, routeLocation, value);
            }

            const route = routeResult.data;
            if (route.type === 'template' && (!route.templates || route.templates.length === 0) && !route.data && !(route as Omit<TemplateRoute, 'path'>).contentType) {
                throw validationError(formatLocation(routeLocation), 'Please define a template, e.g. /about/: about.');
            }

            routes.push({...route, path} as Route);
        }
    }

    const collections: CollectionConfig[] = [];
    if (rawCollections) {
        for (const [path, value] of Object.entries(rawCollections)) {
            const collectionLocation: PathSegment[] = ['collections', path];
            validatePath(path, collectionLocation, '/blog/', {allowParamNotation: true});

            const collectionResult = collectionValueSchema(collectionLocation).safeParse(value);
            if (!collectionResult.success) {
                throw toValidationError(collectionResult.error, collectionLocation, value);
            }

            const collection = collectionResult.data;
            if (!collection.permalink) {
                throw validationError(formatLocation(collectionLocation), 'Please define a permalink route, e.g. permalink: /{slug}/.');
            }
            validatePath(collection.permalink, [...collectionLocation, 'permalink'], '/{slug}/');

            collections.push({...collection, path});
        }
    }

    const taxonomies: TaxonomyConfig = {};
    if (rawTaxonomies) {
        for (const [key, value] of Object.entries(rawTaxonomies)) {
            const taxonomyLocation: PathSegment[] = ['taxonomies', key];
            if (!['tag', 'author'].includes(key)) {
                throw validationError(formatLocation(taxonomyLocation), 'Unknown taxonomy. Please use tag or author.');
            }
            if (!value) {
                throw validationError(formatLocation(taxonomyLocation), `Please define a taxonomy permalink route, e.g. ${key}: /${key}/{slug}/.`);
            }
            validatePath(value, taxonomyLocation, `/${key}/{slug}/`);
            if (key === 'tag') {
                taxonomies.tag = value;
            }
            if (key === 'author') {
                taxonomies.author = value;
            }
        }
    }

    return {routes, collections, taxonomies, yamlSource};
}

export function serializeRouteSettings(settings: Omit<RouteSettings, 'yamlSource'>): string {
    const obj: Record<string, unknown> = {};

    const routes: Record<string, unknown> = {};
    for (const route of settings.routes) {
        if (route.type === 'template' && route.templates?.length === 1 && !route.data && !(route as TemplateRoute).contentType) {
            routes[route.path] = route.templates[0];
        } else {
            const entry: Record<string, unknown> = {};
            if (route.templates && route.templates.length > 0) {
                entry.template = route.templates.length === 1 ? route.templates[0] : route.templates;
            }
            if (route.data !== undefined) {
                entry.data = route.data;
            }
            if (route.type === 'channel') {
                const channel = route as ChannelRoute;
                entry.controller = 'channel';
                if (channel.filter !== undefined) {
                    entry.filter = channel.filter;
                }
                if (channel.order !== undefined) {
                    entry.order = channel.order;
                }
                if (channel.limit !== undefined) {
                    entry.limit = channel.limit;
                }
                if (channel.rss !== undefined) {
                    entry.rss = channel.rss;
                }
            } else {
                const tmpl = route as TemplateRoute;
                if (tmpl.contentType !== undefined) {
                    entry.content_type = tmpl.contentType;
                }
            }
            routes[route.path] = entry;
        }
    }
    obj.routes = Object.keys(routes).length > 0 ? routes : null;

    const collections: Record<string, unknown> = {};
    for (const coll of settings.collections) {
        const entry: Record<string, unknown> = {permalink: coll.permalink};
        if (coll.templates && coll.templates.length > 0) {
            entry.template = coll.templates.length === 1 ? coll.templates[0] : coll.templates;
        }
        if (coll.filter !== undefined) {
            entry.filter = coll.filter;
        }
        if (coll.order !== undefined) {
            entry.order = coll.order;
        }
        if (coll.limit !== undefined) {
            entry.limit = coll.limit;
        }
        if (coll.rss !== undefined) {
            entry.rss = coll.rss;
        }
        if (coll.data !== undefined) {
            entry.data = coll.data;
        }
        collections[coll.path] = entry;
    }
    obj.collections = Object.keys(collections).length > 0 ? collections : null;

    obj.taxonomies = Object.keys(settings.taxonomies).length > 0 ? settings.taxonomies : null;

    return yaml.dump(obj, {quotingType: '\'', forceQuotes: false});
}
