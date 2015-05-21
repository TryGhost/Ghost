// # Custom Middleware
// The following custom middleware functions are all unit testable, and have accompanying unit tests in
// middleware_spec.js

var _           = require('lodash'),
    fs          = require('fs'),
    express     = require('express'),
    config      = require('../config'),
    crypto      = require('crypto'),
    path        = require('path'),
    api         = require('../api'),
    passport    = require('passport'),
    Promise     = require('bluebird'),
    errors      = require('../errors'),
    session     = require('cookie-session'),
    url         = require('url'),
    utils       = require('../utils'),

    busboy       = require('./ghost-busboy'),
    cacheControl = require('./cache-control'),

    middleware,
    blogApp,
    oauthServer,
    loginSecurity = [],
    forgottenSecurity = [],
    protectedSecurity = [];

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

function isSSLrequired(isAdmin, configUrl, forceAdminSSL) {
    var forceSSL = url.parse(configUrl).protocol === 'https:' ? true : false;
    if (forceSSL || (isAdmin && forceAdminSSL)) {
        return true;
    }
    return false;
}

// The guts of checkSSL. Indicate forbidden or redirect according to configuration.
// Required args: forceAdminSSL, url and urlSSL should be passed from config. reqURL from req.url
function sslForbiddenOrRedirect(opt) {
    var forceAdminSSL = opt.forceAdminSSL,
        reqUrl        = opt.reqUrl, // expected to be relative-to-root
        baseUrl       = url.parse(opt.configUrlSSL || opt.configUrl),
        response = {
        // Check if forceAdminSSL: { redirect: false } is set, which means
        // we should just deny non-SSL access rather than redirect
        isForbidden: (forceAdminSSL && forceAdminSSL.redirect !== undefined && !forceAdminSSL.redirect),

        // Append the request path to the base configuration path, trimming out a double "//"
        redirectPathname: function () {
            var pathname  = baseUrl.path;
            if (reqUrl[0] === '/' && pathname[pathname.length - 1] === '/') {
                pathname += reqUrl.slice(1);
            } else {
                pathname += reqUrl;
            }
            return pathname;
        },
        redirectUrl: function (query) {
            return url.format({
                protocol: 'https:',
                hostname: baseUrl.hostname,
                port: baseUrl.port,
                pathname: this.redirectPathname(),
                query: query
            });
        }
    };

    return response;
}

function verifySessionHash(salt, hash) {
    if (!salt || !hash) {
        return Promise.resolve(false);
    }

    return api.settings.read({context: {internal: true}, key: 'password'}).then(function (response) {
        var hasher = crypto.createHash('sha256');

        hasher.update(response.settings[0].value + salt, 'utf8');

        return hasher.digest('hex') === hash;
    });
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

    // Check to see if we should use SSL
    // and redirect if needed
    checkSSL: function (req, res, next) {
        if (isSSLrequired(res.isAdmin, config.url, config.forceAdminSSL)) {
            if (!req.secure) {
                var response = sslForbiddenOrRedirect({
                    forceAdminSSL: config.forceAdminSSL,
                    configUrlSSL: config.urlSSL,
                    configUrl: config.url,
                    reqUrl: req.url
                });

                if (response.isForbidden) {
                    return res.sendStatus(403);
                } else {
                    return res.redirect(301, response.redirectUrl(req.query));
                }
            }
        }
        next();
    },

    checkIsPrivate: function (req, res, next) {
        return api.settings.read({context: {internal: true}, key: 'isPrivate'}).then(function (response) {
            var pass = response.settings[0];

            if (_.isEmpty(pass.value) || pass.value === 'false') {
                res.isPrivateBlog = false;
                return next();
            }

            res.isPrivateBlog = true;

            return session({
                maxAge: utils.ONE_MONTH_MS,
                signed: false
            })(req, res, next);
        });
    },

    filterPrivateRoutes: function (req, res, next) {
        if (res.isAdmin || !res.isPrivateBlog || req.url.lastIndexOf('/private/', 0) === 0) {
            return next();
        }

        // take care of rss and sitemap 404s
        if (req.url.lastIndexOf('/rss', 0) === 0 || req.url.lastIndexOf('/sitemap', 0) === 0) {
            return errors.error404(req, res, next);
        } else if (req.url.lastIndexOf('/robots.txt', 0) === 0) {
            fs.readFile(path.join(config.paths.corePath, 'shared', 'private-robots.txt'), function (err, buf) {
                if (err) {
                    return next(err);
                }
                res.writeHead(200, {
                    'Content-Type': 'text/plain',
                    'Content-Length': buf.length,
                    'Cache-Control': 'public, max-age=' + utils.ONE_HOUR_MS
                });
                res.end(buf);
            });
        } else {
            return middleware.authenticatePrivateSession(req, res, next);
        }
    },

    authenticatePrivateSession: function (req, res, next) {
        var hash = req.session.token || '',
            salt = req.session.salt || '',
            url;

        return verifySessionHash(salt, hash).then(function (isVerified) {
            if (isVerified) {
                return next();
            } else {
                url = config.urlFor({relativeUrl: '/private/'});
                url += req.url === '/' ? '' : '?r=' + encodeURIComponent(req.url);
                return res.redirect(url);
            }
        });
    },

    // This is here so a call to /private/ after a session is verified will redirect to home;
    isPrivateSessionAuth: function (req, res, next) {
        if (!res.isPrivateBlog) {
            return res.redirect(config.urlFor('home', true));
        }

        var hash = req.session.token || '',
            salt = req.session.salt || '';

        return verifySessionHash(salt, hash).then(function (isVerified) {
            if (isVerified) {
                // redirect to home if user is already authenticated
                return res.redirect(config.urlFor('home', true));
            } else {
                return next();
            }
        });
    },

    spamProtectedPrevention: function (req, res, next) {
        var currentTime = process.hrtime()[0],
            remoteAddress = req.connection.remoteAddress,
            rateProtectedPeriod = config.rateProtectedPeriod || 3600,
            rateProtectedAttempts = config.rateProtectedAttempts || 10,
            ipCount = '',
            message = 'Too many attempts.',
            deniedRateLimit = '',
            password = req.body.password;

        if (password) {
            protectedSecurity.push({ip: remoteAddress, time: currentTime});
        } else {
            res.error = {
                message: 'No password entered'
            };
            return next();
        }

        // filter entries that are older than rateProtectedPeriod
        protectedSecurity = _.filter(protectedSecurity, function (logTime) {
            return (logTime.time + rateProtectedPeriod > currentTime);
        });

        ipCount = _.chain(protectedSecurity).countBy('ip').value();
        deniedRateLimit = (ipCount[remoteAddress] > rateProtectedAttempts);

        if (deniedRateLimit) {
            errors.logError(
                'Only ' + rateProtectedAttempts + ' tries per IP address every ' + rateProtectedPeriod + ' seconds.',
                'Too many login attempts.'
            );
            message += rateProtectedPeriod === 3600 ? ' Please wait 1 hour.' : ' Please try again later';
            res.error = {
                message: message
            };
        }
        return next();
    },

    authenticateProtection: function (req, res, next) {
        // if errors have been generated from the previous call
        if (res.error) {
            return next();
        }

        var bodyPass = req.body.password;

        return api.settings.read({context: {internal: true}, key: 'password'}).then(function (response) {
            var pass = response.settings[0],
                hasher = crypto.createHash('sha256'),
                salt = Date.now().toString(),
                forward = req.query && req.query.r ? req.query.r : '/';

            if (pass.value === bodyPass) {
                hasher.update(bodyPass + salt, 'utf8');
                req.session.token = hasher.digest('hex');
                req.session.salt = salt;

                return res.redirect(config.urlFor({relativeUrl: decodeURIComponent(forward)}));
            } else {
                res.error = {
                    message: 'Wrong password'
                };
                return next();
            }
        });
    },

    busboy: busboy,
    cacheControl: cacheControl
};

module.exports = middleware;
module.exports.cacheBlogApp = cacheBlogApp;
module.exports.cacheOauthServer = cacheOauthServer;

// SSL helper functions are exported primarily for unity testing.
module.exports.isSSLrequired = isSSLrequired;
module.exports.sslForbiddenOrRedirect = sslForbiddenOrRedirect;
