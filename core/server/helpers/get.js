// # Get Helper
// Usage: `{{#get "posts" limit="5"}}`, `{{#get "tags" limit="all"}}`
// Fetches data from the API
var proxy = require('./proxy'),
    _ = require('lodash'),
    Promise = require('bluebird'),
    jsonpath = require('jsonpath'),

    logging = proxy.logging,
    i18n = proxy.i18n,
    createFrame = proxy.hbs.handlebars.createFrame,

    api = proxy.api,
    labs = proxy.labs,
    resources,
    pathAliases,
    get;

// Endpoints that the helper is able to access
resources = ['posts', 'tags', 'users'];

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
function isBrowse(resource, options) {
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
function resolvePaths(data, value) {
    var regex = /\{\{(.*?)\}\}/g;

    value = value.replace(regex, function (match, path) {
        var result;

        // Handle aliases
        path = pathAliases[path] ? pathAliases[path] : path;
        // Handle Handlebars .[] style arrays
        path = path.replace(/\.\[/g, '[');

        // Do the query, which always returns an array of matches
        result = jsonpath.query(data, path);

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
function parseOptions(data, options) {
    if (_.isString(options.filter)) {
        options.filter = resolvePaths(data, options.filter);
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

    var self = this,
        data = createFrame(options.data),
        apiOptions = options.hash,
        apiMethod;

    if (!options.fn) {
        data.error = i18n.t('warnings.helpers.mustBeCalledAsBlock', {helperName: 'get'});
        logging.warn(data.error);
        return Promise.resolve();
    }

    if (!_.includes(resources, resource)) {
        data.error = i18n.t('warnings.helpers.get.invalidResource');
        logging.warn(data.error);
        return Promise.resolve(options.inverse(self, {data: data}));
    }

    // Determine if this is a read or browse
    apiMethod = isBrowse(resource, apiOptions) ? api[resource].browse : api[resource].read;
    // Parse the options we're going to pass to the API
    apiOptions = parseOptions(this, apiOptions);

    return apiMethod(apiOptions).then(function success(result) {
        var blockParams;

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
    });
};

module.exports = function getLabsWrapper() {
    var self = this,
        args = arguments;

    return labs.enabledHelper({
        flagKey: 'publicAPI',
        flagName: 'Public API',
        helperName: 'get',
        helpUrl: 'https://help.ghost.org/hc/en-us/articles/115000301672-Public-API-Beta',
        async: true
    }, function executeHelper() {
        return get.apply(self, args);
    });
};
