import yaml from 'js-yaml';
import {z} from 'zod';
import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';

const messages = {
    validationError: 'The following definition "{at}" is invalid: {reason}',
    badDataError: 'Please wrap the data definition into a custom name.',
    badDataHelp: 'Example:\n data:\n  my-tag:\n    resource: tags\n    ...\n',
    authorDeprecatedError: 'Please choose a different name. We recommend not using author.'
};

export type DataShortFormResource = 'tag' | 'page' | 'post' | 'author';
export type DataLongFormResource = 'tags' | 'posts' | 'pages' | 'authors';

export type DataShortForm = `${DataShortFormResource}.${string}`;

export interface DataReadEntry {
    type: 'read';
    resource: DataLongFormResource;
    slug: string;
    redirect?: boolean;
    include?: string;
    visibility?: string;
    status?: string;
}

export interface DataBrowseEntry {
    type: 'browse';
    resource: DataLongFormResource;
    filter?: string;
    limit?: number | 'all';
    order?: string;
    include?: string;
    fields?: string;
    visibility?: string;
    status?: string;
    page?: number;
}

export type DataLongFormEntry = DataReadEntry | DataBrowseEntry;
export type DataEntry = DataShortForm | DataLongFormEntry;
export type RouteData = DataShortForm | Record<string, DataEntry>;

interface RouteBase {
    path: string;
    templates?: string[];
    data?: RouteData;
}

export interface ChannelRoute extends RouteBase {
    type: 'channel';
    filter?: string;
    order?: string;
    limit?: number | 'all';
    rss: boolean;
}

export interface TemplateRoute extends RouteBase {
    type: 'template';
    contentType?: string;
}

export type Route = ChannelRoute | TemplateRoute;

export interface CollectionConfig {
    path: string;
    permalink: string;
    templates?: string[];
    filter?: string;
    order?: string;
    limit?: number | 'all';
    rss?: boolean;
    data?: RouteData;
}

export interface TaxonomyConfig {
    tag?: string;
    author?: string;
}

export interface RouteSettings {
    routes: Route[];
    collections: CollectionConfig[];
    taxonomies: TaxonomyConfig;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function validationError(at: string, reason: string, help?: string): errors.ValidationError {
    return new errors.ValidationError({
        message: tpl(messages.validationError, {at, reason}),
        ...(help ? {help} : {})
    });
}

function pathWithSlashes() {
    return z.string().superRefine((v, ctx) => {
        if (!v.startsWith('/')) {
            ctx.addIssue({code: 'custom', message: tpl(messages.validationError, {at: v, reason: 'A leading slash is required.'})});
        }
        if (!v.endsWith('/')) {
            ctx.addIssue({code: 'custom', message: tpl(messages.validationError, {at: v, reason: 'A trailing slash is required.'})});
        }
        if (/\/:\w+/.test(v)) {
            ctx.addIssue({code: 'custom', message: tpl(messages.validationError, {at: v, reason: 'Please use the following notation e.g. /{slug}/.'})});
        }
    });
}

// ---------------------------------------------------------------------------
// Data schemas
// ---------------------------------------------------------------------------

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
    slug: z.string().min(1, {message: 'slug is required for read data entries.'}),
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

const DataEntrySchema = z.union([DataShortFormSchema, DataLongFormEntrySchema]);

const RouteDataSchema = z.union([
    DataShortFormSchema,
    z.record(z.string(), DataEntrySchema).superRefine((data, ctx) => {
        for (const key of Object.keys(data)) {
            if (RESERVED_DATA_KEYS.includes(key)) {
                ctx.addIssue({code: 'custom', message: tpl(messages.badDataError), path: [key]});
            }
            if (key === 'author') {
                ctx.addIssue({code: 'custom', message: tpl(messages.authorDeprecatedError), path: [key]});
            }
        }
    })
]);

// ---------------------------------------------------------------------------
// Route schemas (raw YAML → domain model)
// ---------------------------------------------------------------------------

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
    data: RouteDataSchema.optional(),
    content_type: z.string().optional(),
    filter: z.string().optional(),
    order: z.string().optional(),
    limit: z.union([z.number(), z.literal('all')]).optional(),
    rss: z.boolean().optional()
}).transform((val): Omit<Route, 'path'> => {
    const templates = val.template;
    const data = val.data as RouteData | undefined;

    if (val.controller === 'channel') {
        const route: Omit<ChannelRoute, 'path'> = {
            type: 'channel',
            templates,
            rss: val.rss ?? true
        };
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

// No union here — string routes are handled in the parseRouteSettings loop
// to avoid Zod v4 union masking inner error messages with "Invalid input".

// ---------------------------------------------------------------------------
// Collection schema
// ---------------------------------------------------------------------------

const RawCollectionValueSchema = z.object({
    permalink: z.string({message: 'Please define a permalink route.'}).pipe(pathWithSlashes()),
    template: TemplateField,
    data: RouteDataSchema.optional(),
    filter: z.string().optional(),
    order: z.string().optional(),
    limit: z.union([z.number(), z.literal('all')]).optional(),
    rss: z.boolean().optional()
}).transform((val): Omit<CollectionConfig, 'path'> => {
    const collection: Omit<CollectionConfig, 'path'> = {
        permalink: val.permalink,
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
    if (val.data !== undefined) {
        collection.data = val.data as RouteData;
    }
    return collection;
});

// ---------------------------------------------------------------------------
// Taxonomy schema
// ---------------------------------------------------------------------------

const TaxonomyValueSchema = pathWithSlashes();

const TaxonomiesSchema = z.record(z.string(), TaxonomyValueSchema)
    .superRefine((obj, ctx) => {
        for (const key of Object.keys(obj)) {
            if (!['tag', 'author'].includes(key)) {
                ctx.addIssue({code: 'custom', message: tpl(messages.validationError, {at: key, reason: 'Unknown taxonomy.'})});
            }
        }
    })
    .transform((obj): TaxonomyConfig => {
        const result: TaxonomyConfig = {};
        if (obj.tag) {
            result.tag = obj.tag;
        }
        if (obj.author) {
            result.author = obj.author;
        }
        return result;
    });

// ---------------------------------------------------------------------------
// Top-level schema
// ---------------------------------------------------------------------------

const RouteSettingsSchema = z.object({
    routes: z.record(z.string(), z.unknown()).nullable().optional().default({}),
    collections: z.record(z.string(), RawCollectionValueSchema).nullable().optional().default({}),
    taxonomies: z.record(z.string(), z.string()).nullable().optional().default({})
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function toValidationError(error: z.ZodError): errors.ValidationError {
    const issue = error.issues[0];
    const isBadDataKey = issue.message === tpl(messages.badDataError);
    return new errors.ValidationError({
        message: issue.message,
        ...(isBadDataKey ? {help: messages.badDataHelp} : {})
    });
}

export function parseRouteSettings(raw: unknown): RouteSettings {
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
                throw validationError(path, 'Please define a template.');
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
                throw validationError(path, 'Please define a template.');
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
            collections.push({...value, path});
        }
    }

    let taxonomies: TaxonomyConfig = {};
    if (rawTaxonomies && Object.keys(rawTaxonomies).length > 0) {
        const taxResult = TaxonomiesSchema.safeParse(rawTaxonomies);
        if (!taxResult.success) {
            throw toValidationError(taxResult.error);
        }
        taxonomies = taxResult.data;
    }

    return {routes, collections, taxonomies};
}

export function serializeRouteSettings(settings: RouteSettings): string {
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
                if (channel.rss !== true) {
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
