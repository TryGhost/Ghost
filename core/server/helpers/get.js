// # Get Helper
// Usage: `{{#get "posts" limit="5"}}`, `{{#get "tags" limit="all"}}`
// Fetches data from the API
var _               = require('lodash'),
    hbs             = require('express-hbs'),
    Promise         = require('bluebird'),
    errors          = require('../errors'),
    api             = require('../api'),
    jsonpath        = require('jsonpath'),
    resources,
    pathAliases,
    get;

// Endpoints that the helper is able to access
resources =  ['posts', 'tags', 'users'];

// Short forms of paths which we should understand
pathAliases     = {
    'post.tags': 'post.tags[*].slug',
    'post.author': 'post.author.slug'
};

/**
 * ## Is Browse
 * Is this a Browse request or a Read request?
 * @param {Object} context
 * @param {Object} options
 * @returns {boolean}
 */
function isBrowse(context, options) {
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

        // Do the query, and convert from array to string
        result = jsonpath.query(data, path).join(',');

        return result;
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
    if (_.isArray(options.tag)) {
        options.tag = _.pluck(options.tag, 'slug').join(',');
    }

    if (_.isObject(options.author)) {
        options.author = options.author.slug;
    }

    if (_.isString(options.filter)) {
        options.filter = resolvePaths(data, options.filter);
    }

    return options;
}

/**
 * ## Get
 * @param {Object} context
 * @param {Object} options
 * @returns {Promise}
 */
get = function get(context, options) {
    options = options || {};
    options.hash = options.hash || {};
    options.data = options.data || {};

    var self = this,
        data = hbs.handlebars.createFrame(options.data),
        apiOptions = _.omit(options.hash, 'context'),
        apiMethod;

    if (!options.fn) {
        data.error = 'Get helper must be called as a block';
        errors.logWarn(data.error);
        return Promise.resolve();
    }

    if (!_.contains(resources, context)) {
        data.error = 'Invalid resource given to get helper';
        errors.logWarn(data.error);
        return Promise.resolve(options.inverse(self, {data: data}));
    }

    // Determine if this is a read or browse
    apiMethod = isBrowse(context, apiOptions) ? api[context].browse : api[context].read;
    // Parse the options we're going to pass to the API
    apiOptions = parseOptions(this, apiOptions);

    return apiMethod(apiOptions).then(function success(result) {
        result = _.merge(self, result);
        if (_.isEmpty(result[context])) {
            return options.inverse(self, {data: data});
        }

        return options.fn(result, {
            data: data,
            blockParams: [result[context]]
        });
    }).catch(function error(err) {
        data.error = err.message;
        return options.inverse(self, {data: data});
    });
};

module.exports = get;
