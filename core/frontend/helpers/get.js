// # Get Helper
// Usage: `{{#get "posts" limit="5"}}`, `{{#get "tags" limit="all"}}`
// Fetches data from the API
var proxy = require('./proxy'),
    _ = require('lodash'),
    Promise = require('bluebird'),
    jsonpath = require('jsonpath'),

    config = proxy.config,
    logging = proxy.logging,
    errors = proxy.errors,
    i18n = proxy.i18n,
    createFrame = proxy.hbs.handlebars.createFrame,

    api = proxy.api,
    pathAliases,
    get;

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
    }
};

// Short forms of paths which we should understand
pathAliases = {
    'post.tags': 'post.tags[*].slug',
    'post.author': 'post.author.slug'
};

/**
 * ## Is Browse
 * Is this a Browse request or a Read request?
 * @param {Object} resource
 * @param {Object} options
 * @returns {boolean}
 */
function isBrowse(options) {
    var browse = true;

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
    var regex = /\{\{(.*?)\}\}/g;

    value = value.replace(regex, function (match, path) {
        var result;

        // Handle aliases
        path = pathAliases[path] ? pathAliases[path] : path;
        // Handle Handlebars .[] style arrays
        path = path.replace(/\.\[/g, '[');

        if (path.charAt(0) === '@') {
            result = jsonpath.query(globals, path.substr(1));
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

    return options;
}

/**
 * ## Get
 * @param {Object} resource
 * @param {Object} options
 * @returns {Promise}
 */
get = function get(resource, options) {
    options = options || {};
    options.hash = options.hash || {};
    options.data = options.data || {};

    const self = this;
    const start = Date.now();
    const data = createFrame(options.data);
    const ghostGlobals = _.omit(data, ['_parent', 'root']);
    const apiVersion = _.get(data, 'root._locals.apiVersion');
    let apiOptions = options.hash;
    let returnedRowsCount;

    if (!options.fn) {
        data.error = i18n.t('warnings.helpers.mustBeCalledAsBlock', {helperName: 'get'});
        logging.warn(data.error);
        return Promise.resolve();
    }

    if (!RESOURCES[resource]) {
        data.error = i18n.t('warnings.helpers.get.invalidResource');
        logging.warn(data.error);
        return Promise.resolve(options.inverse(self, {data: data}));
    }

    const controller = api[apiVersion][RESOURCES[resource].alias];
    const action = isBrowse(apiOptions) ? 'browse' : 'read';

    // Parse the options we're going to pass to the API
    apiOptions = parseOptions(ghostGlobals, this, apiOptions);

    // @TODO: https://github.com/TryGhost/Ghost/issues/10548
    return controller[action](apiOptions).then(function success(result) {
        var blockParams;

        // used for logging details of slow requests
        returnedRowsCount = result[resource] && result[resource].length;

        // block params allows the theme developer to name the data using something like
        // `{{#get "posts" as |result pageInfo|}}`
        blockParams = [result[resource]];
        if (result.meta && result.meta.pagination) {
            result.pagination = result.meta.pagination;
            blockParams.push(result.meta.pagination);
        }

        // Call the main template function
        return options.fn(result, {
            data: data,
            blockParams: blockParams
        });
    }).catch(function error(err) {
        logging.error(err);
        data.error = err.message;
        return options.inverse(self, {data: data});
    }).finally(function () {
        const totalMs = Date.now() - start;
        const logLevel = config.get('logging:slowHelper:level');
        const threshold = config.get('logging:slowHelper:threshold');
        if (totalMs > threshold) {
            logging[logLevel](new errors.HelperWarning({
                message: `{{#get}} helper took ${totalMs}ms to complete`,
                code: 'SLOW_GET_HELPER',
                errorDetails: {
                    api: `${apiVersion}.${controller}.${action}`,
                    apiOptions,
                    returnedRows: returnedRowsCount
                }
            }));
        }
    });
};

module.exports = get;
