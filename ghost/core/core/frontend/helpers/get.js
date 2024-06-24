// # Get Helper
// Usage: `{{#get "posts" limit="5"}}`, `{{#get "tags" limit="all"}}`
// Fetches data from the API
const {config, api, prepareContextResource} = require('../services/proxy');
const {hbs, SafeString} = require('../services/handlebars');

const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const Sentry = require('@sentry/node');

const _ = require('lodash');
const jsonpath = require('jsonpath');
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
            result = jsonpath.query(globals, path.slice(1));
        } else {
            // Do the query, which always returns an array of matches
            result = jsonpath.query(data, path);
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
 * @param {Object} options
 * @returns {*}
 */
function parseOptions(globals, data, options) {
    if (_.isString(options.filter)) {
        options.filter = resolvePaths(globals, data, options.filter);
    }

    if (options.limit === 'all' && config.get('getHelperLimitAllMax')) {
        options.limit = config.get('getHelperLimitAllMax');
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
 * @param {Object} apiOptions
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
    let apiOptionsString = Object.entries(apiOptions)
        .map(([key, value]) => ` ${key}="${value}"`)
        .join('');
    apiOptions.context = {member: data.member};
    try {
        const spanName = `{{#get "${resource}"${apiOptionsString}}} ${data.member ? 'member' : 'public'}`;
        const result = await Sentry.startSpan({
            op: 'frontend.helpers.get',
            name: spanName,
            tags: {
                resource,
                ...apiOptions,
                context: data.member ? 'member' : 'public'
            }
        }, async (span) => {
            const response = await makeAPICall(resource, controllerName, action, apiOptions);

            // prepare data properties for use with handlebars
            if (response[resource] && response[resource].length) {
                response[resource].forEach(prepareContextResource);
            }

            // used for logging details of slow requests
            returnedRowsCount = response[resource] && response[resource].length;
            span?.setTag('returnedRows', returnedRowsCount);

            // block params allows the theme developer to name the data using something like
            // `{{#get "posts" as |result pageInfo|}}`
            const blockParams = [response[resource]];
            if (response.meta && response.meta.pagination) {
                response.pagination = response.meta.pagination;
                blockParams.push(response.meta.pagination);
            }

            // Call the main template function
            const rendered = options.fn(response, {
                data: data,
                blockParams: blockParams
            });

            if (response['@@ABORTED_GET_HELPER@@']) {
                return new SafeString(`<span data-aborted-get-helper>Could not load content</span>` + rendered);
            } else {
                return rendered;
            }
        });
        return result;
    } catch (error) {
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
                        returnedRows: returnedRowsCount
                    }
                }), {
                    time: totalMs
                });
            }
        }
    }
};

module.exports.async = true;

module.exports.optimiseFilterCacheability = optimiseFilterCacheability;
