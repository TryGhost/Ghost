// # Get Helper
// Usage: `{{#get "posts" limit="5"}}`, `{{#get "tags" limit="all"}}`
// Fetches data from the API
const {config, api, prepareContextResource} = require('../services/proxy');
const {hbs, SafeString} = require('../services/handlebars');
const {applyLimitCap} = require('../../shared/max-limit-cap');

const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const _ = require('lodash');
const nqlLang = require('@tryghost/nql-lang');

const messages = {
    mustBeCalledAsBlock: 'The {\\{{helperName}}} helper must be called as a block. E.g. {{#{helperName}}}...{{/{helperName}}}',
    invalidResource: 'Invalid "{resource}" resource given to get helper'
};

const createFrame = hbs.handlebars.createFrame;

const RESOURCES = {
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
const pathAliases = {
    'post.tags': 'post.tags[*].slug',
    'post.author': 'post.author.slug'
};

/**
 * @typedef {Object.<string, unknown>} GetHelperAPIOptions
 * @property {string} [filter] Example: "featured:true" or "featured:true+status:published"
 * @property {string|number} [limit] Example: "3" or 3 or "all"
 * @property {string} [include] Example: "tags,authors"
 * @property {string} [fields] Example: "title,slug"
 * @property {string} [formats] Example: "html"
 * @property {string|number} [page] Example: "2" or 2
 * @property {string} [order] Example: "published_at desc"
 * @property {string} [id] Example: "123"
 * @property {string} [slug] Example: "my-post"
 * @property {{member?: {uuid?: string}}} [context]
 * NOTE: Themes can pass additional top-level query params, and they are forwarded as-is.
 */

/**
 * Generate a deterministic cache key for a {{#get}} query.
 * Sorts top-level option keys for deterministic serialization.
 *
 * @param {string} resource The resource type (posts, tags, etc.)
 * @param {GetHelperAPIOptions} apiOptions The API options
 * @returns {string|null} Deterministic cache key, or null when options are not serializable
 */
function generateCacheKey(resource, apiOptions) {
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

function querySimplePath(obj, pathString) {
    const parts = pathString.split('.');
    let current = [obj];

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
        const key = bracketMatch ? bracketMatch[1] : part;
        const bracket = bracketMatch ? bracketMatch[2] : null;

        const next = [];
        for (const item of current) {
            if (item !== null && item !== undefined && item[key] !== undefined) {
                next.push(item[key]);
            }
        }

        if (bracket === '*') {
            current = next.flatMap(item => (Array.isArray(item) ? item : []));
        } else if (bracket !== null) {
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
 * @param {Object} options
 * @returns {boolean}
 */
function isBrowse(options) {
    let browse = true;

    if (options.id || options.slug) {
        browse = false;
    }

    return browse;
}

/**
 * ## Resolve Paths
 * Find and resolve path strings
 *
 * @param {Object} data
 * @param {String} value
 * @returns {String}
 */
function resolvePaths(globals, data, value) {
    const regex = /\{\{(.*?)\}\}/g;

    value = value.replace(regex, function (match, path) {
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
 *
 * @param {Object} data
 * @param {GetHelperAPIOptions} options
 * @returns {GetHelperAPIOptions}
 */
function parseOptions(globals, data, options) {
    if (_.isString(options.filter)) {
        options.filter = resolvePaths(globals, data, options.filter);
    }

    // Adjust limit to Ghost's max allowed value (default: 100 and no limit=all)
    if (options.limit) {
        options.limit = applyLimitCap(options.limit);
    }

    return options;
}

function optimiseFilterCacheability(resource, options) {
    const noOptimisation = {
        options,
        parseResult(result) {
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
        const query = queries.find((q) => {
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

        const parseResult = function parseResult(result) {
            const filteredPosts = result?.posts?.filter((post) => {
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

/**
 *
 * @param {String} resource
 * @param {String} controllerName
 * @param {String} action
 * @param {GetHelperAPIOptions} apiOptions
 * @returns {Promise<Object>}
 */
async function makeAPICall(resource, controllerName, action, apiOptions) {
    const controller = api[controllerName];
    let makeRequest = options => controller[action](options);

    const {
        options,
        parseResult
    } = optimiseFilterCacheability(resource, apiOptions);

    let timer;

    try {
        let response;

        if (config.get('optimization:getHelper:timeout:threshold')) {
            const logLevel = config.get('optimization:getHelper:timeout:level') || 'error';
            const threshold = config.get('optimization:getHelper:timeout:threshold');

            const apiResponse = makeRequest(options).then(parseResult);

            const timeout = new Promise((resolve) => {
                timer = setTimeout(() => {
                    logging[logLevel](new errors.HelperWarning({
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
 *
 * @param {Object} response API response
 * @param {string} resource Resource type (posts, tags, etc.)
 * @param {Object} options Handlebars options
 * @param {Object} data Handlebars data frame
 * @returns {string | SafeString} Rendered template output
 */
function renderResponse(response, resource, options, data) {
    const templateResponse = {
        ...response,
        [resource]: _.cloneDeep(response[resource])
    };

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

    if (templateResponse['@@ABORTED_GET_HELPER@@']) {
        return new SafeString(`<span data-aborted-get-helper>Could not load content</span>` + rendered);
    }
    return rendered;
}

/**
 * ## Get
 * @param {String} resource
 * @param {Object} options
 * @returns {Promise<any>}
 */
module.exports = async function get(resource, options) {
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
    } catch (error) {
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
                logging[logLevel](new errors.HelperWarning({
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
};

module.exports.async = true;

module.exports.optimiseFilterCacheability = optimiseFilterCacheability;

module.exports.querySimplePath = querySimplePath;
