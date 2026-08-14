/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-this-alias */
// Copied from ghost/core/core/frontend/helpers/get.js @ 407e032dc7 — transforms: imports→seam
// # Get Helper
// Usage: `{{#get "posts" limit="5"}}`, `{{#get "tags" limit="all"}}`
// Fetches data from the API
import {api, config, prepareContextResource} from '../seam/proxy.ts';
import {SafeString, hbs} from '../seam/handlebars-env.ts';
import {applyLimitCap, logging} from '../seam/shared.ts';

import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';

import _ from '../utils/lodash.ts';
// The guard must evaluate before nql-lang (which reads process.env unguarded
// at import and parse time — crashes browsers/workers without it)
import '../utils/process-env-guard.ts';
import nqlLang from '@tryghost/nql-lang';

const messages = {
    mustBeCalledAsBlock: 'The {\\{{helperName}}} helper must be called as a block. E.g. {{#{helperName}}}...{{/{helperName}}}',
    invalidResource: 'Invalid "{resource}" resource given to get helper'
};

const createFrame = hbs.handlebars.createFrame;

const RESOURCES: Record<string, {alias: string}> = {
    posts: {
        alias: 'postsPublic'
    },
    tags: {
        alias: 'tagsPublic'
    },
    pages: {
        alias: 'pagesPublic'
    },
    authors: {
        alias: 'authorsPublic'
    },
    tiers: {
        alias: 'tiersPublic'
    },
    newsletters: {
        alias: 'newslettersPublic'
    }
};

// Short forms of paths which we should understand
const pathAliases: Record<string, string> = {
    'post.tags': 'post.tags[*].slug',
    'post.author': 'post.author.slug'
};

/**
 * Generate a deterministic cache key for a {{#get}} query.
 * Sorts top-level option keys for deterministic serialization.
 */
function generateCacheKey(resource: string, apiOptions: any): string | null {
    const sortedOptions = Object.fromEntries(
        Object.entries(apiOptions).sort(([a], [b]) => a.localeCompare(b))
    );

    try {
        return `${resource}|${JSON.stringify(sortedOptions)}`;
    } catch (err) {
        // If key generation fails, skip deduplication for this invocation.
        return null;
    }
}

/**
 * Resolve a simple path like "post.tags[*].slug" against an object.
 * Supports dot-notation, [N] array indexing, and [*] array wildcards.
 * Always returns an array of matched values.
 */
const VALID_SEGMENT = /^\w+(\[(\*|\d+)\])?$/;

export function querySimplePath(obj: any, pathString: string): any[] {
    const parts = pathString.split('.');
    let current: any[] = [obj];

    for (const part of parts) {
        if (current.length === 0) {
            break;
        }

        if (!VALID_SEGMENT.test(part)) {
            throw new errors.IncorrectUsageError({
                message: `{{#get}} helper — unsupported path segment "${part}" in "${pathString}"`
            });
        }

        // Match e.g. "tags[*]" or "tags[0]"
        const bracketMatch = part.match(/^(.+?)\[(\*|\d+)\]$/);
        const key = bracketMatch ? bracketMatch[1] as string : part;
        const bracket = bracketMatch ? bracketMatch[2] : null;

        const next = [];
        for (const item of current) {
            if (item !== null && item !== undefined && item[key] !== undefined) {
                next.push(item[key]);
            }
        }

        if (bracket === '*') {
            current = next.flatMap(item => (Array.isArray(item) ? item : []));
        } else if (bracket !== null && bracket !== undefined) {
            const index = parseInt(bracket, 10);
            current = next.flatMap(item => (item !== null && item !== undefined && item[index] !== undefined ? [item[index]] : []));
        } else {
            current = next;
        }
    }

    return current;
}

/**
 * ## Is Browse
 * Is this a Browse request or a Read request?
 */
function isBrowse(options: any): boolean {
    let browse = true;

    if (options.id || options.slug) {
        browse = false;
    }

    return browse;
}

/**
 * ## Resolve Paths
 * Find and resolve path strings
 */
function resolvePaths(globals: any, data: any, value: string): string {
    const regex = /\{\{(.*?)\}\}/g;

    value = value.replace(regex, function (_match, path) {
        let result;

        // Handle aliases
        path = pathAliases[path] ? pathAliases[path] : path;
        // Handle Handlebars .[] style arrays
        path = path.replace(/\.\[/g, '[');

        if (path.charAt(0) === '@') {
            result = querySimplePath(globals, path.slice(1));
        } else {
            // Do the query, which always returns an array of matches
            result = querySimplePath(data, path);
        }

        // Handle the case where the single data property we return is a Date
        // Data.toString() is not DB compatible, so use `toISOString()` instead
        if (_.isDate(result[0])) {
            result[0] = result[0].toISOString();
        }

        // Concatenate the results with a comma, handles common case of multiple tag slugs
        return result.join(',');
    });

    return value;
}

/**
 * ## Parse Options
 * Ensure options passed in make sense
 */
function parseOptions(globals: any, data: any, options: any): any {
    if (_.isString(options.filter)) {
        options.filter = resolvePaths(globals, data, options.filter);
    }

    // Adjust limit to Ghost's max allowed value (default: 100 and no limit=all)
    if (options.limit) {
        options.limit = applyLimitCap(options.limit);
    }

    return options;
}

export function optimiseFilterCacheability(resource: string, options: any): any {
    const noOptimisation = {
        options,
        parseResult(result: any) {
            return result;
        }
    };
    if (resource !== 'posts') {
        return noOptimisation;
    }

    if (!options.filter) {
        return noOptimisation;
    }

    try {
        if (options.filter.split('id:-').length !== 2) {
            return noOptimisation;
        }

        const parsedFilter = nqlLang.parse(options.filter);
        // Support either `id:blah` or `id:blah+other:stuff`
        if (!parsedFilter.$and && !parsedFilter.id) {
            return noOptimisation;
        }
        const queries = parsedFilter.$and || [parsedFilter];
        const query = queries.find((q: any) => {
            return q?.id?.$ne;
        });

        if (!query) {
            return noOptimisation;
        }

        const idToFilter = query.id.$ne;

        let limit = options.limit;
        if (options.limit !== 'all') {
            limit = options.limit ? 1 + parseInt(options.limit, 10) : 16;
        }

        // We replace with id:-null so we don't have to deal with leading/trailing AND operators
        const filter = options.filter.replace(/id:-[a-f0-9A-F]{24}/, 'id:-null');

        const parseResult = function parseResult(result: any) {
            const filteredPosts = result?.posts?.filter((post: any) => {
                return post.id !== idToFilter;
            }) || [];

            const modifiedResult = {
                ...result,
                posts: limit === 'all' ? filteredPosts : filteredPosts.slice(0, limit - 1)
            };

            modifiedResult.meta = modifiedResult.meta || {};
            modifiedResult.meta.cacheabilityOptimisation = true;

            if (typeof modifiedResult?.meta?.pagination?.limit === 'number') {
                modifiedResult.meta.pagination.limit = modifiedResult.meta.pagination.limit - 1;
            }

            return modifiedResult;
        };

        return {
            options: {
                ...options,
                limit,
                filter
            },
            parseResult
        };
    } catch (err) {
        logging.warn(err);
        return noOptimisation;
    }
}

async function makeAPICall(resource: string, controllerName: string, action: string, apiOptions: any): Promise<any> {
    const controller = api[controllerName];
    const makeRequest = (requestOptions: any) => controller[action](requestOptions);

    const {
        options,
        parseResult
    } = optimiseFilterCacheability(resource, apiOptions);

    let timer: any;

    try {
        let response;

        if (config.get('optimization:getHelper:timeout:threshold')) {
            const logLevel = config.get('optimization:getHelper:timeout:level') || 'error';
            const threshold = config.get('optimization:getHelper:timeout:threshold');

            const apiResponse = makeRequest(options).then(parseResult);
            // consume rejections that happen after the timeout has already won
            // the race — they'd otherwise crash the process as unhandled
            apiResponse.catch(() => {});

            const timeout = new Promise((resolve) => {
                timer = setTimeout(() => {
                    (logging as any)[logLevel](new errors.HelperWarning({
                        message: `{{#get}} took longer than ${threshold}ms and was aborted`,
                        code: 'ABORTED_GET_HELPER',
                        errorDetails: {
                            api: `${controllerName}.${action}`,
                            apiOptions
                        }
                    }));

                    resolve({[resource]: [], '@@ABORTED_GET_HELPER@@': true});
                }, threshold);
            });

            response = await Promise.race([apiResponse, timeout]);
            clearTimeout(timer);
        } else {
            response = await makeRequest(options).then(parseResult);
        }

        return response;
    } catch (err) {
        clearTimeout(timer);
        throw err;
    }
}

/**
 * Prepare and render the response from a {{#get}} query
 */
function renderResponse(response: any, resource: string, options: any, data: any) {
    const templateResponse = {
        ...response,
        [resource]: _.cloneDeep(response[resource])
    };

    // consume the internal abort marker so it doesn't leak into the template context
    // (templateResponse is a shallow copy, so the shared `response` object is untouched)
    const degraded = templateResponse['@@ABORTED_GET_HELPER@@'];
    delete templateResponse['@@ABORTED_GET_HELPER@@'];

    // prepare data properties for use with handlebars
    if (templateResponse[resource] && templateResponse[resource].length) {
        templateResponse[resource].forEach(prepareContextResource);
    }

    // block params allows the theme developer to name the data using something like
    // `{{#get "posts" as |result pageInfo|}}`
    const blockParams = [templateResponse[resource]];
    if (templateResponse.meta && templateResponse.meta.pagination) {
        templateResponse.pagination = templateResponse.meta.pagination;
        blockParams.push(templateResponse.meta.pagination);
    }

    // Call the main template function
    const rendered = options.fn(templateResponse, {
        data: data,
        blockParams: blockParams
    });

    if (degraded) {
        if (options.data?.root?._locals) {
            options.data.root._locals.degradedRender = true;
        }
        return new SafeString(`<span data-aborted-get-helper>Could not load content</span>` + rendered);
    }
    return rendered;
}

/**
 * ## Get
 */
async function get(this: any, resource: string, options: any) {
    options = options || {};
    options.hash = options.hash || {};
    options.data = options.data || {};

    const self = this;
    const start = Date.now();
    const data = createFrame(options.data);
    const ghostGlobals = _.omit(data, ['_parent', 'root']);

    let apiOptions = options.hash;
    let returnedRowsCount;

    if (!options.fn) {
        data.error = tpl(messages.mustBeCalledAsBlock, {helperName: 'get'});
        logging.warn(data.error);
        return;
    }

    if (!RESOURCES[resource]) {
        data.error = tpl(messages.invalidResource, {resource});
        logging.warn(data.error);
        return options.inverse(self, {data: data});
    }

    const controllerName = RESOURCES[resource].alias;
    const action = isBrowse(apiOptions) ? 'browse' : 'read';

    // Parse the options we're going to pass to the API
    apiOptions = parseOptions(ghostGlobals, this, apiOptions);
    apiOptions.context = {member: data.member};

    // {{url}} on the results reads the serializer-attached url, so a narrowed
    // fields list must still include it
    if (['posts', 'pages', 'tags'].includes(resource) && _.isString(apiOptions.fields)) {
        const fields = apiOptions.fields.split(',').map((field: string) => field.trim());
        if (!fields.includes('url')) {
            apiOptions.fields = [...fields, 'url'].join(',');
        }
    }

    // Per-request deduplication: check if we have a cached result for this query
    const queryCache = options.data?._queryCache instanceof Map ? options.data._queryCache : null;
    let cacheKey;
    let cachedResponse;

    if (queryCache) {
        cacheKey = generateCacheKey(resource, apiOptions);

        if (cacheKey && queryCache.has(cacheKey)) {
            try {
                // Await cached promise (handles both resolved and in-flight)
                cachedResponse = await queryCache.get(cacheKey);
            } catch (error) {
                // Cached promise rejected - fall through to make new request
                queryCache.delete(cacheKey);
            }
        }
    }

    try {
        if (cachedResponse) {
            returnedRowsCount = cachedResponse[resource] && cachedResponse[resource].length;
            return renderResponse(cachedResponse, resource, options, data);
        }

        // Store promise before awaiting to dedupe concurrent in-flight requests
        const responsePromise = makeAPICall(resource, controllerName, action, apiOptions);

        if (queryCache && cacheKey) {
            queryCache.set(cacheKey, responsePromise);
        }

        const response = await responsePromise;

        // used for logging details of slow requests
        returnedRowsCount = response[resource] && response[resource].length;

        return renderResponse(response, resource, options, data);
    } catch (error: any) {
        // Remove failed API request from cache so retries can try again.
        // Do not evict cache when rendering a cached response fails.
        if (!cachedResponse && queryCache && cacheKey) {
            queryCache.delete(cacheKey);
        }
        logging.error(error);
        data.error = error.message;
        return options.inverse(self, {data: data});
    } finally {
        if (config.get('optimization:getHelper:notify:threshold')) {
            const totalMs = Date.now() - start;
            const logLevel = config.get('optimization:getHelper:notify:level') || 'warn';
            const threshold = config.get('optimization:getHelper:notify:threshold');
            if (totalMs > threshold) {
                (logging as any)[logLevel](new errors.HelperWarning({
                    message: `{{#get}} helper took ${totalMs}ms to complete`,
                    code: 'SLOW_GET_HELPER',
                    errorDetails: {
                        api: `${controllerName}.${action}`,
                        apiOptions,
                        time: totalMs,
                        returnedRows: returnedRowsCount
                    }
                }));
            }
        }
    }
}

get.async = true;

export default get;
