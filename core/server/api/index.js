// # Ghost Data API
// Provides access from anywhere to the Ghost data layer.
//
// Ghost's JSON API is integral to the workings of Ghost, regardless of whether you want to access data internally,
// from a theme, an app, or from an external app, you'll use the Ghost JSON API to do so.

var _              = require('lodash'),
    Promise        = require('bluebird'),
    config         = require('../config'),
    configuration  = require('./configuration'),
    db             = require('./db'),
    mail           = require('./mail'),
    notifications  = require('./notifications'),
    posts          = require('./posts'),
    schedules      = require('./schedules'),
    roles          = require('./roles'),
    settings       = require('./settings'),
    tags           = require('./tags'),
    clients        = require('./clients'),
    users          = require('./users'),
    slugs          = require('./slugs'),
    themes         = require('./themes'),
    subscribers    = require('./subscribers'),
    authentication = require('./authentication'),
    uploads        = require('./upload'),
    exporter       = require('../data/export'),
    slack          = require('./slack'),
    readThemes     = require('../utils/read-themes'),

    http,
    addHeaders,
    cacheInvalidationHeader,
    locationHeader,
    contentDispositionHeaderExport,
    contentDispositionHeaderSubscribers,
    init;

/**
 * ### Init
 * Initialise the API - populate the settings cache
 * @return {Promise(Settings)} Resolves to Settings Collection
 */
init = function init() {
    return settings.read({context: {internal: true}, key: 'activeTheme'})
        .then(function initActiveTheme(response) {
            var activeTheme = response.settings[0].value;
            return readThemes.active(config.paths.themePath, activeTheme);
        })
        .then(function (result) {
            config.set({paths: {availableThemes: result}});
            return settings.updateSettingsCache();
        });
};

function isActiveThemeOverride(method, endpoint, result) {
    return method === 'POST' && endpoint === 'themes' && result.themes && result.themes[0] && result.themes[0].active === true;
}

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
cacheInvalidationHeader = function cacheInvalidationHeader(req, result) {
    var parsedUrl = req._parsedUrl.pathname.replace(/^\/|\/$/g, '').split('/'),
        method = req.method,
        endpoint = parsedUrl[0],
        subdir = parsedUrl[1],
        jsonResult = result.toJSON ? result.toJSON() : result,
        INVALIDATE_ALL = '/*',
        post,
        hasStatusChanged,
        wasPublishedUpdated;

    if (isActiveThemeOverride(method, endpoint, result)) {
        // Special case for if we're overwriting an active theme
        // @TODO: remove these crazy DIRTY HORRIBLE HACKSSS
        req.app.set('activeTheme', null);
        config.assetHash = null;
        return INVALIDATE_ALL;
    } else if (['POST', 'PUT', 'DELETE'].indexOf(method) > -1) {
        if (endpoint === 'schedules' && subdir === 'posts') {
            return INVALIDATE_ALL;
        }
        if (['settings', 'users', 'db', 'tags'].indexOf(endpoint) > -1) {
            return INVALIDATE_ALL;
        } else if (endpoint === 'posts') {
            if (method === 'DELETE') {
                return INVALIDATE_ALL;
            }

            post = jsonResult.posts[0];
            hasStatusChanged = post.statusChanged;
            // Invalidate cache when post was updated but not when post is draft
            wasPublishedUpdated = method === 'PUT' && post.status === 'published';

            // Remove the statusChanged value from the response
            delete post.statusChanged;

            // Don't set x-cache-invalidate header for drafts
            if (hasStatusChanged || wasPublishedUpdated) {
                return INVALIDATE_ALL;
            } else {
                return config.urlFor({relativeUrl: '/' + config.routeKeywords.preview + '/' + post.uuid + '/'});
            }
        }
    }
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
locationHeader = function locationHeader(req, result) {
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

contentDispositionHeaderExport = function contentDispositionHeaderExport() {
    return exporter.fileName().then(function then(filename) {
        return 'Attachment; filename="' + filename + '"';
    });
};

contentDispositionHeaderSubscribers = function contentDispositionHeaderSubscribers() {
    var datetime = (new Date()).toJSON().substring(0, 10);
    return Promise.resolve('Attachment; filename="subscribers.' + datetime + '.csv"');
};

addHeaders = function addHeaders(apiMethod, req, res, result) {
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

    // Add Export Content-Disposition Header
    if (apiMethod === db.exportContent) {
        contentDisposition = contentDispositionHeaderExport()
            .then(function addContentDispositionHeaderExport(header) {
                res.set({
                    'Content-Disposition': header
                });
            });
    }

    // Add Subscribers Content-Disposition Header
    if (apiMethod === subscribers.exportCSV) {
        contentDisposition = contentDispositionHeaderSubscribers()
            .then(function addContentDispositionHeaderSubscribers(header) {
                res.set({
                    'Content-Disposition': header,
                    'Content-Type': 'text/csv'
                });
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
http = function http(apiMethod) {
    return function apiHandler(req, res, next) {
        // We define 2 properties for using as arguments in API calls:
        var object = req.body,
            options = _.extend({}, req.file, req.query, req.params, {
                context: {
                    user: ((req.user && req.user.id) || (req.user && req.user.id === 0)) ? req.user.id : null,
                    client: (req.client && req.client.slug) ? req.client.slug : null
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
            return addHeaders(apiMethod, req, res, (response || {}));
        }).then(function then(response) {
            if (req.method === 'DELETE') {
                return res.status(204).end();
            }
            // Keep CSV header and formatting
            if (res.get('Content-Type') && res.get('Content-Type').indexOf('text/csv') === 0) {
                return res.status(200).send(response);
            }

            // CASE: api method response wants to handle the express response
            // example: serve files (stream)
            if (_.isFunction(response)) {
                return response(req, res, next);
            }

            // Send a properly formatting HTTP response containing the data with correct headers
            res.json(response || {});
        }).catch(function onAPIError(error) {
            // To be handled by the API middleware
            next(error);
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
    schedules: schedules,
    roles: roles,
    settings: settings,
    tags: tags,
    clients: clients,
    users: users,
    slugs: slugs,
    subscribers: subscribers,
    authentication: authentication,
    uploads: uploads,
    slack: slack,
    themes: themes
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
