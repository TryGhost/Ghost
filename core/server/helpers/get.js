// # Get Helper
// Usage: `{{#get "posts" limit="5"}}`, `{{#get "tags" limit="all"}}`
// Fetches data from the API
var _               = require('lodash'),
    hbs             = require('express-hbs'),
    Promise         = require('bluebird'),
    errors          = require('../errors'),
    api             = require('../api'),
    resources,
    get;

// Endpoints that the helper is able to access
resources =  ['posts', 'tags', 'users'];

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
        var blockParams;

        // If no result is found, call the inverse or `{{else}}` function
        if (_.isEmpty(result[context])) {
            return options.inverse(self, {data: data});
        }

        // block params allows the theme developer to name the data using something like
        // `{{#get "posts" as |result pagination|}}`
        blockParams = [result[context]];
        if (result.meta && result.meta.pagination) {
            blockParams.push(result.meta.pagination);
        }

        // Call the main template function
        return options.fn(result, {
            data: data,
            blockParams: blockParams
        });
    }).catch(function error(err) {
        data.error = err.message;
        return options.inverse(self, {data: data});
    });
};

module.exports = get;
