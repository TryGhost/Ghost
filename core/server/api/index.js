// # Ghost Data API
// Provides access to the data model

var _             = require('lodash'),
    when          = require('when'),
    config        = require('../config'),
    // Include Endpoints
    db            = require('./db'),
    mail          = require('./mail'),
    notifications = require('./notifications'),
    posts         = require('./posts'),
    settings      = require('./settings'),
    tags          = require('./tags'),
    themes        = require('./themes'),
    users         = require('./users'),

    http,
    formatHttpErrors,
    cacheInvalidationHeader,
    locationHeader,
    contentDispositionHeader,
    init,

/**
 * ### Init
 * Initialise the API - populate the settings cache
 * @return {Promise(Settings)} Resolves to Settings Collection
 */
init = function () {
    return settings.updateSettingsCache();
};

/**
 * ### Cache Invalidation Header
 * Calculate the header string for the X-Cache-Invalidate: header.
 * The resulting string instructs any cache in front of the blog that request has occurred which invalidates any cached
 * versions of the listed URIs.
 *
 * `/*` is used to mean the entire cache is invalid
 *
 * @private
 * @param {Express.request} req Original HTTP Request
 * @param {Object} result API method result
 * @return {Promise(String)} Resolves to header string
 */
cacheInvalidationHeader = function (req, result) {
    var parsedUrl = req._parsedUrl.pathname.replace(/\/$/, '').split('/'),
        method = req.method,
        endpoint = parsedUrl[4],
        id = parsedUrl[5],
        cacheInvalidate,
        jsonResult = result.toJSON ? result.toJSON() : result,
        post,
        wasPublished,
        wasDeleted;

    if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
        if (endpoint === 'settings' || endpoint === 'users' || endpoint === 'db') {
            cacheInvalidate = '/*';
        } else if (endpoint === 'posts') {
            post = jsonResult.posts[0];
            wasPublished = post.statusChanged && post.status === 'published';
            wasDeleted = method === 'DELETE';

            // Remove the statusChanged value from the response
            if (post.statusChanged) {
                delete post.statusChanged;
            }

            // Don't set x-cache-invalidate header for drafts
            if (wasPublished || wasDeleted) {
                cacheInvalidate = '/, /page/*, /rss/, /rss/*, /tag/*';
                if (id && post.slug) {
                    return config.urlForPost(settings, post).then(function (postUrl) {
                        return cacheInvalidate + ', ' + postUrl;
                    });
                }
            }
        }
    }

    return when(cacheInvalidate);
};

/**
 * ### Location Header
 *
 * If the API request results in the creation of a new object, construct a Location: header which points to the new
 * resource.
 *
 * @private
 * @param {Express.request} req Original HTTP Request
 * @param {Object} result API method result
 * @return {Promise(String)} Resolves to header string
 */
locationHeader = function (req, result) {
    var apiRoot = config.urlFor('api'),
        location,
        post,
        notification,
        parsedUrl = req._parsedUrl.pathname.replace(/\/$/, '').split('/'),
        endpoint = parsedUrl[4];

    if (req.method === 'POST') {
        if (result.hasOwnProperty('posts')) {
            post = result.posts[0];
            location = apiRoot + '/posts/' + post.id + '/?status=' + post.status;
        } else if (endpoint === 'notifications') {
            notification = result.notifications;
            location = apiRoot + '/notifications/' + notification[0].id;
        }
    }

    return when(location);
};

/**
 * ### Content Disposition Header
 * create a header that invokes the 'Save As' dialog in the browser when exporting the database to file. The 'filename'
 * parameter is governed by [RFC6266](http://tools.ietf.org/html/rfc6266#section-4.3).
 *
 * For encoding whitespace and non-ISO-8859-1 characters, you MUST use the "filename*=" attribute, NOT "filename=".
 * Ideally, both. Examples: http://tools.ietf.org/html/rfc6266#section-5
 *
 * We'll use ISO-8859-1 characters here to keep it simple.
 *
 * @private
 * @see http://tools.ietf.org/html/rfc598
 * @return {string}
 */
contentDispositionHeader = function () {
    // replace ':' with '_' for OS that don't support it
    var now = (new Date()).toJSON().replace(/:/g, '_');
    return 'Attachment; filename="ghost-' + now + '.json"';
};


/**
 * ### Format HTTP Errors
 * Converts the error response from the API into a format which can be returned over HTTP
 *
 * @private
 * @param {Array} error
 * @return {{errors: Array, statusCode: number}}
 */
formatHttpErrors = function (error) {
    var statusCode = 500,
        errors = [];

    if (!_.isArray(error)) {
        error = [].concat(error);
    }

    _.each(error, function (errorItem) {
        var errorContent = {};

        //TODO: add logic to set the correct status code
        statusCode = errorItem.code || 500;

        errorContent.message = _.isString(errorItem) ? errorItem :
            (_.isObject(errorItem) ? errorItem.message : 'Unknown API Error');
        errorContent.type = errorItem.type || 'InternalServerError';
        errors.push(errorContent);
    });

    return {errors: errors, statusCode: statusCode};
};

/**
 * ### HTTP
 *
 * Decorator for API functions which are called via an HTTP request. Takes the API method and wraps it so that it gets
 * data from the request and returns a sensible JSON response.
 *
 * @public
 * @param {Function} apiMethod API method to call
 * @return {Function} middleware format function to be called by the route when a matching request is made
 */
http = function (apiMethod) {
    return function (req, res) {
        // We define 2 properties for using as arguments in API calls:
        var object = req.body,
            options = _.extend({}, req.files, req.query, req.params, {
                context: {
                    user: (req.session && req.session.user) ? req.session.user : null
                }
            });

        // If this is a GET, or a DELETE, req.body should be null, so we only have options (route and query params)
        // If this is a PUT, POST, or PATCH, req.body is an object
        if (_.isEmpty(object)) {
            object = options;
            options = {};
        }

        return apiMethod(object, options)
            // Handle adding headers
            .then(function onSuccess(result) {
                // Add X-Cache-Invalidate header
                return cacheInvalidationHeader(req, result)
                    .then(function addCacheHeader(header) {
                        if (header) {
                            res.set({'X-Cache-Invalidate': header});
                        }

                        // Add Location header
                        return locationHeader(req, result);
                    }).then(function addLocationHeader(header) {
                        if (header) {
                            res.set({'Location': header});
                        }

                        // Add Content-Disposition Header
                        if (apiMethod === db.exportContent) {
                            res.set({
                                'Content-Disposition': contentDispositionHeader()
                            });
                        }
                        // #### Success
                        // Send a properly formatting HTTP response containing the data with correct headers
                        res.json(result || {});
                    });
            }).catch(function onError(error) {
                // #### Error
                var httpErrors = formatHttpErrors(error);
                // Send a properly formatted HTTP response containing the errors
                res.json(httpErrors.statusCode, {errors: httpErrors.errors});
            });
    };
};

/**
 * ## Public API
 */
module.exports = {
    // Extras
    init: init,
    http: http,
    // API Endpoints
    db: db,
    mail: mail,
    notifications: notifications,
    posts: posts,
    settings: settings,
    tags: tags,
    themes: themes,
    users: users
};
