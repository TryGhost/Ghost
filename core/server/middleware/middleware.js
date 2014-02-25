// # Custom Middleware
// The following custom middleware functions are all unit testable, and have accompanying unit tests in
// middleware_spec.js

var _           = require('lodash'),
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

    // ### Authenticate Middleware
    // authentication has to be done for /ghost/* routes with
    // exceptions for signin, signout, signup, forgotten, reset only
    // api and frontend use different authentication mechanisms atm
    authenticate: function (req, res, next) {
        var noAuthNeeded = [
                '/ghost/signin/', '/ghost/signout/', '/ghost/signup/',
                '/ghost/forgotten/', '/ghost/reset/'
            ],
            subPath;

        // SubPath is the url path starting after any default subdirectories
        // it is stripped of anything after the two levels `/ghost/.*?/` as the reset link has an argument
        subPath = req.path.substring(config().paths.subdir.length);
        /*jslint regexp:true, unparam:true*/
        subPath = subPath.replace(/^(\/.*?\/.*?\/)(.*)?/, function (match, a) {
            return a;
        });

        if (res.isAdmin) {
            if (subPath.indexOf('/ghost/api/') === 0) {
                return middleware.authAPI(req, res, next);
            }

            if (noAuthNeeded.indexOf(subPath) < 0) {
                return middleware.auth(req, res, next);
            }
        }
        next();
    },

    // ### Auth Middleware
    // Authenticate a request by redirecting to login if not logged in.
    // We strip /ghost/ out of the redirect parameter for neatness
    auth: function (req, res, next) {
        if (!req.session.user) {
            var subPath = req.path.substring(config().paths.subdir.length),
                reqPath = subPath.replace(/^\/ghost\/?/gi, ''),
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
                return res.redirect(config().paths.subdir + '/ghost/signin/' + redirect);
            });
        }
        next();
    },

    // ## AuthApi Middleware
    // Authenticate a request to the API by responding with a 401 and json error details
    authAPI: function (req, res, next) {
        if (!req.session.user) {
            res.json(401, { error: 'Please sign in' });
            return;
        }

        next();
    },

    // Check if we're logged in, and if so, redirect people back to dashboard
    // Login and signup forms in particular
    redirectToDashboard: function (req, res, next) {
        if (req.session.user) {
            return res.redirect(config().paths.subdir + '/ghost/');
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
            express['static'](path.join(config().paths.themePath, activeTheme.value), {maxAge: ONE_HOUR_MS})(req, res, next);
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