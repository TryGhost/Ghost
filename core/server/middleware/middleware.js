// # Custom Middleware
// The following custom middleware functions are all unit testable, and have accompanying unit tests in
// middleware_spec.js

var _           = require('underscore'),
    express     = require('express'),
    busboy      = require('./ghost-busboy'),
    config      = require('../config'),
    path        = require('path'),
    api         = require('../api'),

    expressServer,
    ONE_HOUR_MS = 60 * 60 * 1000;

function isBlackListedFileType(file) {
    var blackListedFileTypes = ['.hbs', '.md', '.json'],
        ext = path.extname(file);
    return _.contains(blackListedFileTypes, ext);
}

function cacheServer(server) {
    expressServer = server;
}

var middleware = {

    // ### Auth Middleware
    // Authenticate a request by redirecting to login if not logged in.
    // We strip /ghost/ out of the redirect parameter for neatness
    auth: function (req, res, next) {
        if (!req.session.user) {
            var reqPath = req.path.replace(/^\/ghost\/?/gi, ''),
                redirect = '',
                msg;

            return api.notifications.browse().then(function (notifications) {
                if (reqPath !== '') {
                    msg = {
                        type: 'error',
                        message: 'Please Sign In',
                        status: 'passive',
                        id: 'failedauth'
                    };
                    // let's only add the notification once
                    if (!_.contains(_.pluck(notifications, 'id'), 'failedauth')) {
                        api.notifications.add(msg);
                    }
                    redirect = '?r=' + encodeURIComponent(reqPath);
                }
                return res.redirect(config.paths().subdir + '/ghost/signin/' + redirect);
            });
        }
        next();
    },

    // ## AuthApi Middleware
    // Authenticate a request to the API by responding with a 401 and json error details
    authAPI: function (req, res, next) {
        if (!req.session.user) {
            // TODO: standardize error format/codes/messages
            res.json(401, { error: 'Please sign in' });
            return;
        }

        next();
    },

    // Check if we're logged in, and if so, redirect people back to dashboard
    // Login and signup forms in particular
    redirectToDashboard: function (req, res, next) {
        if (req.session.user) {
            return res.redirect(config.paths().subdir + '/ghost/');
        }

        next();
    },

    // While we're here, let's clean up on aisle 5
    // That being ghost.notifications, and let's remove the passives from there
    // plus the local messages, as they have already been added at this point
    // otherwise they'd appear one too many times
    cleanNotifications: function (req, res, next) {
        /*jslint unparam:true*/
        api.notifications.browse().then(function (notifications) {
            _.each(notifications, function (notification) {
                if (notification.status === 'passive') {
                    api.notifications.destroy(notification);
                }
            });
            next();
        });
    },

    // ### CacheControl Middleware
    // provide sensible cache control headers
    cacheControl: function (options) {
        /*jslint unparam:true*/
        var profiles = {
                'public': 'public, max-age=0',
                'private': 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
            },
            output;

        if (_.isString(options) && profiles.hasOwnProperty(options)) {
            output = profiles[options];
        }

        return function cacheControlHeaders(req, res, next) {
            if (output) {
                res.set({'Cache-Control': output});
            }
            next();
        };
    },

    // ### whenEnabled Middleware
    // Selectively use middleware
    // From https://github.com/senchalabs/connect/issues/676#issuecomment-9569658
    whenEnabled: function (setting, fn) {
        return function settingEnabled(req, res, next) {
            // Set from server/middleware/index.js for now
            if (expressServer.enabled(setting)) {
                fn(req, res, next);
            } else {
                next();
            }
        };
    },

    staticTheme: function () {
        return function blackListStatic(req, res, next) {
            if (isBlackListedFileType(req.url)) {
                return next();
            }

            return middleware.forwardToExpressStatic(req, res, next);
        };
    },

    // to allow unit testing
    forwardToExpressStatic: function (req, res, next) {
        api.settings.read('activeTheme').then(function (activeTheme) {
            // For some reason send divides the max age number by 1000
            express['static'](path.join(config.paths().themePath, activeTheme.value), {maxAge: ONE_HOUR_MS})(req, res, next);
        });
    },

    conditionalCSRF: function (req, res, next) {
        var csrf = express.csrf();
        // CSRF is needed for admin only
        if (res.isAdmin) {
            csrf(req, res, next);
            return;
        }
        next();
    },

    busboy: busboy
};

module.exports = middleware;
module.exports.cacheServer = cacheServer;