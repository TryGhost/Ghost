// # Ghost Data API
// Provides access to the data model

var _             = require('underscore'),
    when          = require('when'),
    errors        = require('../errorHandling'),
    db            = require('./db'),
    settings      = require('./settings'),
    notifications = require('./notifications'),
    config        = require('../config'),
    posts         = require('./posts'),
    users         = require('./users'),
    tags          = require('./tags'),
    requestHandler,
    init;

// ## Request Handlers

function invalidateCache(req, res, result) {
    var parsedUrl = req._parsedUrl.pathname.replace(/\/$/, '').split('/'),
        method = req.method,
        endpoint = parsedUrl[4],
        id = parsedUrl[5],
        cacheInvalidate,
        jsonResult = result.toJSON ? result.toJSON() : result;

    if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
        if (endpoint === 'settings' || endpoint === 'users') {
            cacheInvalidate = "/*";
        } else if (endpoint === 'posts') {
            cacheInvalidate = "/, /page/*, /rss/, /rss/*";
            if (id && jsonResult.slug) {
                cacheInvalidate += ', /' + jsonResult.slug + '/';
            }
        }
        if (cacheInvalidate) {
            res.set({
                "X-Cache-Invalidate": cacheInvalidate
            });
        }
    }
}

// ### requestHandler
// decorator for api functions which are called via an HTTP request
// takes the API method and wraps it so that it gets data from the request and returns a sensible JSON response
requestHandler = function (apiMethod) {
    return function (req, res) {
        var options = _.extend(req.body, req.query, req.params),
            apiContext = {
                user: req.session && req.session.user
            },
            postRouteIndex,
            i;

        settings.read('permalinks').then(function (permalinks) {
            // If permalinks have changed, find old post route
            if (req.body.permalinks && req.body.permalinks !== permalinks) {
                for (i = 0; i < req.app.routes.get.length; i += 1) {
                    if (req.app.routes.get[i].path === config.paths().webroot + permalinks) {
                        postRouteIndex = i;
                        break;
                    }
                }
            }

            return apiMethod.call(apiContext, options).then(function (result) {
                // Reload post route
                if (postRouteIndex) {
                    req.app.get(permalinks, req.app.routes.get.splice(postRouteIndex, 1)[0].callbacks);
                }

                invalidateCache(req, res, result);
                res.json(result || {});
            }, function (error) {
                var errorCode = error.errorCode || 500,
                    errorMsg = {error: _.isString(error) ? error : (_.isObject(error) ? error.message : 'Unknown API Error')};
                res.json(errorCode, errorMsg);
            });
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
    requestHandler: requestHandler,
    init: init
};
