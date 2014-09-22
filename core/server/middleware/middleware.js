// # Custom Middleware
// The following custom middleware functions are all unit testable, and have accompanying unit tests in
// middleware_spec.js

var _           = require('lodash'),
    express     = require('express'),
    busboy      = require('./ghost-busboy'),
    config      = require('../config'),
    path        = require('path'),
    api         = require('../api'),
    passport    = require('passport'),
    errors      = require('../errors'),
    utils       = require('../utils'),

    middleware,
    blogApp,
    oauthServer,
    loginSecurity = [],
    forgottenSecurity = [];

function isBlackListedFileType(file) {
    var blackListedFileTypes = ['.hbs', '.md', '.json'],
        ext = path.extname(file);
    return _.contains(blackListedFileTypes, ext);
}

function cacheBlogApp(app) {
    blogApp = app;
}

function cacheOauthServer(server) {
    oauthServer = server;
}

middleware = {

    // ### Authenticate Middleware
    // authentication has to be done for /ghost/* routes with
    // exceptions for signin, signout, signup, forgotten, reset only
    // api and frontend use different authentication mechanisms atm
    authenticate: function (req, res, next) {
        var path,
            subPath;

        // SubPath is the url path starting after any default subdirectories
        // it is stripped of anything after the two levels `/ghost/.*?/` as the reset link has an argument
        path = req.path;
        /*jslint regexp:true, unparam:true*/
        subPath = path.replace(/^(\/.*?\/.*?\/)(.*)?/, function (match, a) {
            return a;
        });

        if (subPath.indexOf('/ghost/api/') === 0
            && path.indexOf('/ghost/api/v0.1/authentication/') !== 0) {
            return passport.authenticate('bearer', {session: false, failWithError: true},
                function (err, user, info) {
                    if (err) {
                        return next(err); // will generate a 500 error
                    }
                    // Generate a JSON response reflecting authentication status
                    if (!user) {
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
        next();
    },

    // ### CacheControl Middleware
    // provide sensible cache control headers
    cacheControl: function (options) {
        /*jslint unparam:true*/
        var profiles = {
                public: 'public, max-age=0',
                private: 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
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
            if (blogApp.enabled(setting)) {
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

            express['static'](path.join(config.paths.themePath, activeTheme.value), {maxAge: utils.ONE_YEAR_MS})(req, res, next);
        });
    },
    // ### Spam prevention Middleware
    // limit signin requests to ten failed requests per IP per hour
    spamSigninPrevention: function (req, res, next) {
        var currentTime = process.hrtime()[0],
            remoteAddress = req.connection.remoteAddress,
            deniedRateLimit = '',
            ipCount = '',
            message = 'Too many attempts.',
            rateSigninPeriod = config.rateSigninPeriod || 3600,
            rateSigninAttempts = config.rateSigninAttempts || 10;

        if (req.body.username && req.body.grant_type === 'password') {
            loginSecurity.push({ip: remoteAddress, time: currentTime, email: req.body.username});
        } else if (req.body.grant_type === 'refresh_token') {
            return next();
        } else {
            return next(new errors.BadRequestError('No username.'));
        }

        // filter entries that are older than rateSigninPeriod
        loginSecurity = _.filter(loginSecurity, function (logTime) {
            return (logTime.time + rateSigninPeriod > currentTime);
        });

        // check number of tries per IP address
        ipCount = _.chain(loginSecurity).countBy('ip').value();
        deniedRateLimit = (ipCount[remoteAddress] > rateSigninAttempts);

        if (deniedRateLimit) {
            errors.logError(
                'Only ' + rateSigninAttempts + ' tries per IP address every ' + rateSigninPeriod + ' seconds.',
                'Too many login attempts.'
            );
            message += rateSigninPeriod === 3600 ? ' Please wait 1 hour.' : ' Please try again later';
            return next(new errors.UnauthorizedError(message));
        }
        next();
    },

    // ### Spam prevention Middleware
    // limit forgotten password requests to five requests per IP per hour for different email addresses
    // limit forgotten password requests to five requests per email address
    spamForgottenPrevention: function (req, res, next) {
        var currentTime = process.hrtime()[0],
            remoteAddress = req.connection.remoteAddress,
            rateForgottenPeriod = config.rateForgottenPeriod || 3600,
            rateForgottenAttempts = config.rateForgottenAttempts || 5,
            email = req.body.passwordreset[0].email,
            ipCount = '',
            deniedRateLimit = '',
            deniedEmailRateLimit = '',
            message = 'Too many attempts.',
            index = _.findIndex(forgottenSecurity, function (logTime) {
                return (logTime.ip === remoteAddress && logTime.email === email);
            });

        if (email) {
            if (index !== -1) {
                forgottenSecurity[index].count = forgottenSecurity[index].count + 1;
            } else {
                forgottenSecurity.push({ip: remoteAddress, time: currentTime, email: email, count: 0});
            }
        } else {
            return next(new errors.BadRequestError('No email.'));
        }

        // filter entries that are older than rateForgottenPeriod
        forgottenSecurity = _.filter(forgottenSecurity, function (logTime) {
            return (logTime.time + rateForgottenPeriod > currentTime);
        });

        // check number of tries with different email addresses per IP
        ipCount = _.chain(forgottenSecurity).countBy('ip').value();
        deniedRateLimit = (ipCount[remoteAddress] > rateForgottenAttempts);

        if (index !== -1) {
            deniedEmailRateLimit = (forgottenSecurity[index].count > rateForgottenAttempts);
        }

        if (deniedEmailRateLimit) {
            errors.logError(
                'Only ' + rateForgottenAttempts + ' forgotten password attempts per email every ' +
                rateForgottenPeriod + ' seconds.',
                'Forgotten password reset attempt failed'
            );
        }

        if (deniedRateLimit) {
            errors.logError(
                'Only ' + rateForgottenAttempts + ' tries per IP address every ' + rateForgottenPeriod + ' seconds.',
                'Forgotten password reset attempt failed'
            );
        }

        if (deniedEmailRateLimit || deniedRateLimit) {
            message += rateForgottenPeriod === 3600 ? ' Please wait 1 hour.' : ' Please try again later';
            return next(new errors.UnauthorizedError(message));
        }

        next();
    },
    resetSpamCounter: function (email) {
        loginSecurity = _.filter(loginSecurity, function (logTime) {
            return (logTime.email !== email);
        });
    },

    // work around to handle missing client_secret
    // oauth2orize needs it, but untrusted clients don't have it
    addClientSecret: function (req, res, next) {
        if (!req.body.client_secret) {
            req.body.client_secret = 'not_available';
        }
        next();
    },

    // ### Authenticate Client Middleware
    // authenticate client that is asking for an access token
    authenticateClient: function (req, res, next) {
        return passport.authenticate(['oauth2-client-password'], {session: false})(req, res, next);
    },

    // ### Generate access token Middleware
    // register the oauth2orize middleware for password and refresh token grants
    generateAccessToken: function (req, res, next) {
        return oauthServer.token()(req, res, next);
    },

    busboy: busboy
};

module.exports = middleware;
module.exports.cacheBlogApp = cacheBlogApp;
module.exports.cacheOauthServer = cacheOauthServer;
