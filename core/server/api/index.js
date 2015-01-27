// # Ghost Data API
// Provides access from anywhere to the Ghost data layer.
//
// Ghost's JSON API is integral to the workings of Ghost, regardless of whether you want to access data internally,
// from a theme, an app, or from an external app, you'll use the Ghost JSON API to do so.

var _              = require('lodash'),
    config         = require('../config'),
    // Include Endpoints
    configuration  = require('./configuration'),
    db             = require('./db'),
    mail           = require('./mail'),
    notifications  = require('./notifications'),
    posts          = require('./posts'),
    roles          = require('./roles'),
    settings       = require('./settings'),
    tags           = require('./tags'),
    themes         = require('./themes'),
    users          = require('./users'),
    slugs          = require('./slugs'),
    authentication = require('./authentication'),
    uploads        = require('./upload'),
    dataExport     = require('../data/export'),
    errors         = require('../errors'),

    http,
    formatHttpErrors,
    addHeaders,
    cacheInvalidationHeader,
    locationHeader,
    contentDispositionHeader,
    init;

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
 * @return {String} Resolves to header string
 */
cacheInvalidationHeader = function (req, result) {
    var parsedUrl = req._parsedUrl.pathname.replace(/^\/|\/$/g, '').split('/'),
        method = req.method,
        endpoint = parsedUrl[0],
        id = parsedUrl[1],
        cacheInvalidate,
        jsonResult = result.toJSON ? result.toJSON() : result,
        post,
        hasStatusChanged,
        wasDeleted,
        wasPublishedUpdated;

    if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
        if (endpoint === 'settings' || endpoint === 'users' || endpoint === 'db' || endpoint === 'tags') {
            cacheInvalidate = '/*';
        } else if (endpoint === 'posts') {
            post = jsonResult.posts[0];
            hasStatusChanged = post.statusChanged;
            wasDeleted = method === 'DELETE';
            // Invalidate cache when post was updated but not when post is draft
            wasPublishedUpdated = method === 'PUT' && post.status === 'published';

            // Remove the statusChanged value from the response
            delete post.statusChanged;

            // Don't set x-cache-invalidate header for drafts
            if (hasStatusChanged || wasDeleted || wasPublishedUpdated) {
                cacheInvalidate = '/, /page/*, /rss/, /rss/*, /tag/*, /author/*, /sitemap-*.xml';
                if (id && post.slug && post.url) {
                    cacheInvalidate +=  ', ' + post.url;
                }
            }
        }
    }

    return cacheInvalidate;
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
 * @return {String} Resolves to header string
 */
locationHeader = function (req, result) {
    var apiRoot = config.urlFor('api'),
        location,
        newObject;

    if (req.method === 'POST') {
        if (result.hasOwnProperty('posts')) {
            newObject = result.posts[0];
            location = apiRoot + '/posts/' + newObject.id + '/?status=' + newObject.status;
        } else if (result.hasOwnProperty('notifications')) {
            newObject = result.notifications[0];
            location = apiRoot + '/notifications/' + newObject.id + '/';
        } else if (result.hasOwnProperty('users')) {
            newObject = result.users[0];
            location = apiRoot + '/users/' + newObject.id + '/';
        } else if (result.hasOwnProperty('tags')) {
            newObject = result.tags[0];
            location = apiRoot + '/tags/' + newObject.id + '/';
        }
    }

    return location;
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
    return dataExport.fileName().then(function (filename) {
        return 'Attachment; filename="' + filename + '"';
    });
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

        // TODO: add logic to set the correct status code
        statusCode = errorItem.code || 500;

        errorContent.message = _.isString(errorItem) ? errorItem :
            (_.isObject(errorItem) ? errorItem.message : 'Unknown API Error');
        errorContent.type = errorItem.type || 'InternalServerError';
        errors.push(errorContent);
    });

    return {errors: errors, statusCode: statusCode};
};

addHeaders = function (apiMethod, req, res, result) {
    var cacheInvalidation,
        location,
        contentDisposition;

    cacheInvalidation = cacheInvalidationHeader(req, result);
    if (cacheInvalidation) {
        res.set({'X-Cache-Invalidate': cacheInvalidation});
    }

    if (req.method === 'POST') {
        location = locationHeader(req, result);
        if (location) {
            res.set({Location: location});
            // The location header indicates that a new object was created.
            // In this case the status code should be 201 Created
            res.status(201);
        }
    }

    if (apiMethod === db.exportContent) {
        contentDisposition = contentDispositionHeader()
            .then(function addContentDispositionHeader(header) {
                // Add Content-Disposition Header
                if (apiMethod === db.exportContent) {
                    res.set({
                        'Content-Disposition': header
                    });
                }
            });
    }

    return contentDisposition;
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
                    user: (req.user && req.user.id) ? req.user.id : null
                }
            });

        // If this is a GET, or a DELETE, req.body should be null, so we only have options (route and query params)
        // If this is a PUT, POST, or PATCH, req.body is an object
        if (_.isEmpty(object)) {
            object = options;
            options = {};
        }

        return apiMethod(object, options).tap(function onSuccess(response) {
            // Add X-Cache-Invalidate, Location, and Content-Disposition headers
            return addHeaders(apiMethod, req, res, response);
        }).then(function (response) {
            // Send a properly formatting HTTP response containing the data with correct headers
            res.json(response || {});
        }).catch(function onError(error) {
            errors.logError(error);
            var httpErrors = formatHttpErrors(error);
            // Send a properly formatted HTTP response containing the errors
            res.status(httpErrors.statusCode).json({errors: httpErrors.errors});
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
    configuration: configuration,
    db: db,
    mail: mail,
    notifications: notifications,
    posts: posts,
    roles: roles,
    settings: settings,
    tags: tags,
    themes: themes,
    users: users,
    slugs: slugs,
    authentication: authentication,
    uploads: uploads
};

/**
 * ## API Methods
 *
 * Most API methods follow the BREAD pattern, although not all BREAD methods are available for all resources.
 * Most API methods have a similar signature, they either take just `options`, or both `object` and `options`.
 * For RESTful resources `object` is always a model object of the correct type in the form `name: [{object}]`
 * `options` is an object with several named properties, the possibilities are listed for each method.
 *
 * Read / Edit / Destroy routes expect some sort of identifier (id / slug / key) for which object they are handling
 *
 * All API methods take a context object as one of the options:
 *
 * @typedef context
 * Context provides information for determining permissions. Usually a user, but sometimes an app, or the internal flag
 * @param {Number} user (optional)
 * @param {String} app (optional)
 * @param {Boolean} internal (optional)
 */
