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

    expressServer,
    oauthServer,
    loginSecurity = [];

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
        path = req.path.substring(config.paths.subdir.length);
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

            express['static'](path.join(config.paths.themePath, activeTheme.value), {maxAge: utils.ONE_YEAR_MS})(req, res, next);
        });
    },

    // ### Spam prevention Middleware
    // limit signin requests to one every two seconds
    spamPrevention: function (req, res, next) {
        var currentTime = process.hrtime()[0],
            remoteAddress = req.connection.remoteAddress,
            deniedSpam = '',
            deniedRateLimit = '',
            ipCount = '',
            spamTimeout = config.spamTimeout || 2,
            ratePeriod = config.ratePeriod || 3600,
            rateAttempts = config.rateAttempts || 5;

        // filter for IPs that tried to login in the last 2 sec
        loginSecurity = _.filter(loginSecurity, function (logTime) {
            return (logTime.time + ratePeriod > currentTime);
        });
        

        // check if IP tried to login in the last 2 sec
        deniedSpam = _.find(loginSecurity, function (logTime) {
            return (logTime.time + spamTimeout > currentTime && logTime.ip === remoteAddress);
        });
        
        // check if IP tried to login more than 'rateAttempts' time in the last 'ratePeriod' seconds
        ipCount = _.chain(loginSecurity).countBy('ip').value();
        deniedRateLimit = (ipCount[remoteAddress] > rateAttempts);

        if ((!deniedSpam && !deniedRateLimit) || expressServer.get('disableLoginLimiter') === true) {
            loginSecurity.push({ip: remoteAddress, time: currentTime});
            next();
        } else {
            if (deniedRateLimit) {
                return next(new errors.UnauthorizedError('Only ' + rateAttempts + ' tries per IP address every ' + ratePeriod + ' seconds.'));
            } else {
                return next(new errors.UnauthorizedError('Slow down, there are way too many login attempts!'));
            }
        }
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
        return passport.authenticate(['oauth2-client-password'], { session: false })(req, res, next);
    },

    // ### Generate access token Middleware
    // register the oauth2orize middleware for password and refresh token grants
    generateAccessToken: function (req, res, next) {
        return oauthServer.token()(req, res, next);
    },

    busboy: busboy
};

module.exports = middleware;
module.exports.cacheServer = cacheServer;
module.exports.cacheOauthServer = cacheOauthServer;
