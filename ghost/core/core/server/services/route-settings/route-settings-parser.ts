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
import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';

const messages = {
    validationError: 'The following definition "{at}" is invalid: {reason}',
    badDataError: 'Please wrap the data definition into a custom name.',
    badDataHelp: 'Example:\n data:\n  my-tag:\n    resource: tags\n    ...\n',
    authorDeprecatedError: 'Please choose a different name. We recommend not using author.'
};

function validationError(at: string, reason: string, help?: string): errors.ValidationError {
    return new errors.ValidationError({
        message: tpl(messages.validationError, {at, reason}),
        ...(help ? {help} : {})
    });
}

const VALID_SHORTFORM_RESOURCES = ['tag', 'page', 'post', 'author'] as const;
const VALID_LONGFORM_RESOURCES = ['tags', 'posts', 'pages', 'authors'] as const;
const RESERVED_DATA_KEYS = ['resource', 'type', 'limit', 'order', 'include', 'filter', 'status', 'visibility', 'slug', 'redirect'];

const DataShortFormSchema = z.string().superRefine((v, ctx) => {
    if (!/^[a-zA-Z0-9_]+\.[a-zA-Z0-9_-]+$/.test(v)) {
        ctx.addIssue({code: 'custom', message: tpl(messages.validationError, {at: v, reason: 'Incorrect Format. Please use e.g. tag.recipes'})});
        return;
    }
    const resource = v.split('.')[0];
    if (!(VALID_SHORTFORM_RESOURCES as readonly string[]).includes(resource)) {
        ctx.addIssue({code: 'custom', message: tpl(messages.validationError, {at: v, reason: `${resource} not supported. Please use ${VALID_SHORTFORM_RESOURCES.join(', ')}.`})});
    }
});

const DataReadEntrySchema = z.object({
    type: z.literal('read'),
    resource: z.enum(VALID_LONGFORM_RESOURCES),
    slug: z.string({message: 'slug is required for read data entries.'}).min(1, {message: 'slug is required for read data entries.'}),
    redirect: z.boolean().optional(),
    include: z.string().optional(),
    visibility: z.string().optional(),
    status: z.string().optional()
});

const DataBrowseEntrySchema = z.object({
    type: z.literal('browse'),
    resource: z.enum(VALID_LONGFORM_RESOURCES),
    filter: z.string().optional(),
    limit: z.union([z.number(), z.literal('all')]).optional(),
    order: z.string().optional(),
    include: z.string().optional(),
    fields: z.string().optional(),
    visibility: z.string().optional(),
    status: z.string().optional(),
    page: z.number().optional()
});

const DataLongFormEntrySchema = z.discriminatedUnion('type', [DataReadEntrySchema, DataBrowseEntrySchema]);

function parseDataEntry(key: string, value: unknown): DataEntry {
    if (typeof value === 'string') {
        const result = DataShortFormSchema.safeParse(value);
        if (!result.success) {
            throw toValidationError(result.error);
        }
        return value as DataShortForm;
    }

    if (typeof value === 'object' && value !== null) {
        const result = DataLongFormEntrySchema.safeParse(value);
        if (!result.success) {
            const issue = result.error.issues[0];
            if (issue.message.includes('discriminator')) {
                const typeVal = (value as Record<string, unknown>).type;
                if (typeVal === undefined) {
                    throw validationError(JSON.stringify(value), 'type is required.');
                }
                throw validationError(JSON.stringify(value), `${typeVal} not supported. Please use read, browse.`);
            }
            if (issue.path?.includes('resource')) {
                const resVal = (value as Record<string, unknown>).resource;
                if (resVal === undefined) {
                    throw validationError(JSON.stringify(value), 'resource is required.');
                }
                throw validationError(JSON.stringify(value), `${resVal} not supported. Please use ${VALID_LONGFORM_RESOURCES.join(', ')}.`);
            }
            throw toValidationError(result.error);
        }
        return result.data;
    }

    throw validationError(key, 'Incorrect Format. Please use e.g. tag.recipes');
}

function parseRouteData(data: unknown): RouteData {
    if (typeof data === 'string') {
        const result = DataShortFormSchema.safeParse(data);
        if (!result.success) {
            throw toValidationError(result.error);
        }
        return data as DataShortForm;
    }

    if (typeof data !== 'object' || data === null) {
        throw validationError(String(data), 'Incorrect Format. Please use e.g. tag.recipes');
    }

    const record = data as Record<string, unknown>;

    for (const key of Object.keys(record)) {
        if (RESERVED_DATA_KEYS.includes(key)) {
            throw new errors.ValidationError({
                message: tpl(messages.badDataError),
                help: messages.badDataHelp
            });
        }
        if (key === 'author') {
            throw new errors.ValidationError({
                message: tpl(messages.authorDeprecatedError)
            });
        }
    }

    const parsed: Record<string, DataEntry> = {};
    for (const [key, value] of Object.entries(record)) {
        parsed[key] = parseDataEntry(key, value);
    }
    return parsed;
}

const TemplateField = z.union([z.string(), z.array(z.string())]).optional().default([])
    .transform(v => {
        if (!v || (Array.isArray(v) && v.length === 0)) {
            return [];
        }
        return Array.isArray(v) ? v : [v];
    });

const RouteObjectSchema = z.object({
    controller: z.literal('channel').optional(),
    template: TemplateField,
    data: z.unknown().optional(),
    content_type: z.string().optional(),
    filter: z.string().optional(),
    order: z.string().optional(),
    limit: z.union([z.number(), z.literal('all')]).optional(),
    rss: z.boolean().optional()
}).transform((val): Omit<Route, 'path'> => {
    const templates = val.template;
    const data = val.data !== undefined ? parseRouteData(val.data) : undefined;

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

const RawCollectionValueSchema = z.object({
    permalink: z.string({message: 'Please define a permalink route.'}).optional(),
    template: TemplateField,
    data: z.unknown().optional(),
    filter: z.string().optional(),
    order: z.string().optional(),
    limit: z.union([z.number(), z.literal('all')]).optional(),
    rss: z.boolean().optional()
}).transform((val): Omit<CollectionConfig, 'path'> => {
    const data = val.data !== undefined ? parseRouteData(val.data) : undefined;
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
    collections: z.record(z.string(), RawCollectionValueSchema).nullable().optional().default({}),
    taxonomies: z.record(z.string(), z.string()).nullable().optional().default({})
});

function toValidationError(error: z.ZodError): errors.ValidationError {
    const issue = error.issues[0];
    return new errors.ValidationError({
        message: issue.message
    });
}

export function parseRouteSettings(raw: unknown, yamlSource: string): RouteSettings {
    const obj = raw ?? {};

    const parsed = RouteSettingsSchema.safeParse(obj);
    if (!parsed.success) {
        throw toValidationError(parsed.error);
    }

    const {routes: rawRoutes, collections: rawCollections, taxonomies: rawTaxonomies} = parsed.data;

    const routes: Route[] = [];
    if (rawRoutes) {
        for (const [path, value] of Object.entries(rawRoutes)) {
            if (!path.startsWith('/')) {
                throw validationError(path, 'A leading slash is required.');
            }
            if (!path.endsWith('/')) {
                throw validationError(path, 'A trailing slash is required.');
            }
            if (/\/:\w+/.test(path)) {
                throw validationError(path, 'Please use the following notation e.g. /{slug}/.');
            }

            if (value === null || value === undefined) {
                throw validationError(path, 'Please define a template.', 'e.g. /about/: about');
            }

            if (typeof value === 'string') {
                routes.push({type: 'template', path, templates: [value]});
                continue;
            }

            const routeResult = RouteObjectSchema.safeParse(value);
            if (!routeResult.success) {
                throw toValidationError(routeResult.error);
            }

            const route = routeResult.data;
            if (route.type === 'template' && (!route.templates || route.templates.length === 0) && !route.data && !(route as Omit<TemplateRoute, 'path'>).contentType) {
                throw validationError(path, 'Please define a template.', 'e.g. /about/: about');
            }

            routes.push({...route, path} as Route);
        }
    }

    const collections: CollectionConfig[] = [];
    if (rawCollections) {
        for (const [path, value] of Object.entries(rawCollections)) {
            if (!path.startsWith('/')) {
                throw validationError(path, 'A leading slash is required.');
            }
            if (!path.endsWith('/')) {
                throw validationError(path, 'A trailing slash is required.');
            }
            if (/\/:\w+/.test(path)) {
                throw validationError(path, 'Please use the following notation e.g. /{slug}/.');
            }
            if (!value.permalink) {
                throw validationError(path, 'Please define a permalink route.', 'e.g. permalink: /{slug}/');
            }
            if (!value.permalink.startsWith('/')) {
                throw validationError(value.permalink, 'A leading slash is required.');
            }
            if (!value.permalink.endsWith('/')) {
                throw validationError(value.permalink, 'A trailing slash is required.');
            }
            if (/\/:\w+/.test(value.permalink)) {
                throw validationError(value.permalink, 'Please use the following notation e.g. /{slug}/.');
            }
            collections.push({...value, path});
        }
    }

    const taxonomies: TaxonomyConfig = {};
    if (rawTaxonomies) {
        for (const [key, value] of Object.entries(rawTaxonomies)) {
            if (!['tag', 'author'].includes(key)) {
                throw validationError(key, 'Unknown taxonomy.');
            }
            if (!value) {
                throw validationError(key, 'Please define a taxonomy permalink route.', 'e.g. tag: /tag/{slug}/');
            }
            if (!value.startsWith('/')) {
                throw validationError(value, 'A leading slash is required.');
            }
            if (!value.endsWith('/')) {
                throw validationError(value, 'A trailing slash is required.');
            }
            if (/\/:\w+/.test(value)) {
                throw validationError(value, 'Please use the following notation e.g. /{slug}/.');
            }
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
