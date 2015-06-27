// # Get Helper
// Usage: `{{#get "posts" limit="5"}}`, `{{#get "tags" limit="all"}}`
// Fetches data from the API

var _               = require('lodash'),
    hbs             = require('express-hbs'),
    errors          = require('../errors'),
    api             = require('../api'),
    jsonpath        = require('jsonpath'),

    resources       = ['posts', 'tags', 'users'],
    pathAliases     = {
        'post.tags': 'post.tags[*].slug',
        'post.author':  'post.author.slug'
    },
    get;

function doBrowse(context, options) {
    var browse = true;
    if (options.limit && options.limit === 1) {
        browse = false;
    }

    if (options.id || options.slug) {
        browse = false;
    }

    return browse;
}

function resolvePaths(data, value) {
    var regex = /\{\{(.*?)\}\}/g;

    value = value.replace(regex, function (match, path) {
        var result;

        // Handle tag, author and role aliases
        path = pathAliases[path] ? pathAliases[path] : path;

        result = jsonpath.query(data, path);

        if (_.isArray(result)) {
            result = result.join(',');
        }

        return result;
    });

    return value;
}

function parseOptions(data, options) {
    options = _.omit(options.hash, 'context');
    if (_.isArray(options.tag)) {
        options.tag = _.pluck(options.tag, 'slug').join(',');
    }

    if (_.isString(options.filter)) {
        options.filter = resolvePaths(data, options.filter);
    }

    return options;
}

get = function get(context, options) {
    options = options || {};
    options.hash = options.hash || {};

    var self = this,
        data,
        apiOptions,
        apiMethod;

    if (!_.contains(resources, context)) {
        errors.logWarn('Invalid resource given to get helper');
        return;
    }

    if (options.data) {
        data = hbs.handlebars.createFrame(options.data);
    }

    // Determine if this is a read or browse
    apiMethod = doBrowse(context, options) ? api[context].browse : api[context].read;
    // Parse the options we're going to pass to the API
    apiOptions = parseOptions(this, options);

    return apiMethod(apiOptions).then(function success(result) {
        var data = _.merge(self, result);
        if (_.isEmpty(result[context])) {
            return options.inverse(self);
        }

        return options.fn(data, {
            data: data,
            blockParams: [result[context]]
        });
    }).catch(function error(err) {
        if (data) {
            data.error = err.message;
        }
        return options.inverse(self, {data: data});
    });
};

module.exports = get;
