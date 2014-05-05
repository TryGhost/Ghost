// # Ghost Data API
// Provides access to the data model

var _             = require('lodash'),
    when          = require('when'),
    config        = require('../config'),
    db            = require('./db'),
    settings      = require('./settings'),
    notifications = require('./notifications'),
    posts         = require('./posts'),
    users         = require('./users'),
    tags          = require('./tags'),
    mail          = require('./mail'),
    requestHandler,
    init,

    errorTypes = {
        BadRequest: {
            code: 400
        },
        Unauthorized: {
            code: 401
        },
        NoPermission: {
            code: 403
        },
        NotFound: {
            code: 404
        },
        RequestEntityTooLarge: {
            code: 413
        },
        ValidationError: {
            code: 422
        },
        EmailError: {
            code: 500
        },
        InternalServerError: {
            code: 500
        }
    };

// ## Request Handlers

function cacheInvalidationHeader(req, result) {
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
}

// if api request results in the creation of a new object, construct
// a Location: header that points to the new resource.
//
// arguments: request object, result object from the api call
// returns: a promise that will be fulfilled with the location of the
// resource
function locationHeader(req, result) {
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
            notification = result;
            location = apiRoot + '/notifications/' + notification.id;
        }
    }

    return when(location);
}

// ### requestHandler
// decorator for api functions which are called via an HTTP request
// takes the API method and wraps it so that it gets data from the request and returns a sensible JSON response
requestHandler = function (apiMethod) {
    return function (req, res) {
        var options = _.extend(req.body, req.files, req.query, req.params),
            apiContext = {
                user: (req.session && req.session.user) ? req.session.user : null
            };

        return apiMethod.call(apiContext, options).then(function (result) {
            return cacheInvalidationHeader(req, result).then(function (header) {
                if (header) {
                    res.set({
                        "X-Cache-Invalidate": header
                    });
                }
            })
            .then(function () {
                return locationHeader(req, result).then(function (header) {
                    if (header) {
                        res.set({
                            'Location': header
                        });
                    }
                    
                    res.json(result || {});
                });
            });
        }, function (error) {
            var errorCode,
                errors = [];

            if (!_.isArray(error)) {
                error = [].concat(error);
            }

            _.each(error, function (erroritem) {
                var errorContent = {};
                
                //TODO: add logic to set the correct status code
                errorCode = errorTypes[erroritem.type].code || 500;
                
                errorContent['message'] = _.isString(erroritem) ? erroritem : (_.isObject(erroritem) ? erroritem.message : 'Unknown API Error');
                errorContent['type'] = erroritem.type || 'InternalServerError';
                errors.push(errorContent);
            });

            res.json(errorCode, {errors: errors});
        });
    };
};

init = function () {
    return settings.updateSettingsCache();
};

// Public API
module.exports = {
    posts: posts,
    users: users,
    tags: tags,
    notifications: notifications,
    settings: settings,
    db: db,
    mail: mail,
    requestHandler: requestHandler,
    init: init
};
