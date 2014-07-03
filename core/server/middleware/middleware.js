// # Custom Middleware
// The following custom middleware functions are all unit testable, and have accompanying unit tests in
// middleware_spec.js

var _           = require('lodash'),
    csrf        = require('csurf'),
    express     = require('express'),
    busboy      = require('./ghost-busboy'),
    config      = require('../config'),
    path        = require('path'),
    api         = require('../api'),
    passport    = require('passport'),

    expressServer,
    oauthServer,
    ONE_HOUR_MS = 60 * 60 * 1000,
    ONE_YEAR_MS = 365 * 24 * ONE_HOUR_MS;

function isBlackListedFileType(file) {
    var blackListedFileTypes = ['.hbs', '.md', '.json'],
        ext = path.extname(file);
    return _.contains(blackListedFileTypes, ext);
}

function cacheServer(server) {
    expressServer = server;
}

function cacheOauthServer(server) {
    oauthServer = server;
}

var middleware = {

    // ### Authenticate Middleware
    // authentication has to be done for /ghost/* routes with
    // exceptions for signin, signout, signup, forgotten, reset only
    // api and frontend use different authentication mechanisms atm
    authenticate: function (req, res, next) {
        var path,
            subPath;

        // SubPath is the url path starting after any default subdirectories
        // it is stripped of anything after the two levels `/ghost/.*?/` as the reset link has an argument
        path = req.path.substring(config().paths.subdir.length);
        /*jslint regexp:true, unparam:true*/
        subPath = path.replace(/^(\/.*?\/.*?\/)(.*)?/, function (match, a) {
            return a;
        });

        if (res.isAdmin) {
            if (subPath.indexOf('/ghost/api/') === 0
                && path.indexOf('/ghost/api/v0.1/authentication/') !== 0) {

                return passport.authenticate('bearer', { session: false, failWithError: true },
                    function (err, user, info) {
                        if (err) {
                            return next(err); // will generate a 500 error
                        }
                        // Generate a JSON response reflecting authentication status
                        if (! user) {
                            var msg = {
                                type: 'error',
                                message: 'Please Sign In',
                                status: 'passive'
                            };
                            res.status(401);
                            return res.send(msg);
                        }
                        // TODO: figure out, why user & authInfo is lost
                        req.authInfo = info;
                        req.user = user;
                        return next(null, user, info);
                    }
                )(req, res, next);
            }
        }
        next();
    },

    // Check if we're logged in, and if so, redirect people back to dashboard
    // Login and signup forms in particular
    redirectToDashboard: function (req, res, next) {
        if (req.user && req.user.id) {
            return res.redirect(config().paths.subdir + '/ghost/');
        }

        next();
    },

    // While we're here, let's clean up on aisle 5
    // That being ghost.notifications, and let's remove the passives from there
    // plus the local messages, as they have already been added at this point
    // otherwise they'd appear one too many times
    // ToDo: Remove once ember handles passive notifications.
    cleanNotifications: function (req, res, next) {
        /*jslint unparam:true*/
        api.notifications.browse().then(function (notifications) {
            _.each(notifications.notifications, function (notification) {
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
        api.settings.read({context: {internal: true}, key: 'activeTheme'}).then(function (response) {
            var activeTheme = response.settings[0];

            express['static'](path.join(config().paths.themePath, activeTheme.value), {maxAge: ONE_YEAR_MS})(req, res, next);
        });
    },

    conditionalCSRF: function (req, res, next) {
        // CSRF is needed for admin only
        if (res.isAdmin) {
            csrf()(req, res, next);
            return;
        }
        next();
    },

    // work around to handle missing client_secret
    // oauth2orize needs it, but untrusted clients don't have it
    addClientSecret: function (req, res, next) {
        if (!req.body.client_secret) {
            req.body.client_secret = 'not_available';
        }
        next();
    },
    authenticateClient: function (req, res, next) {
        return passport.authenticate(['oauth2-client-password'], { session: false })(req, res, next);
    },
    generateAccessToken: function (req, res, next) {
        return oauthServer.token()(req, res, next);
    },

    busboy: busboy
};

module.exports = middleware;
module.exports.cacheServer = cacheServer;
module.exports.cacheOauthServer = cacheOauthServer;
