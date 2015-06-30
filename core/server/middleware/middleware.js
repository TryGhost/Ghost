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
    spamPrevention   = require('./spam-prevention'),
    clientAuth       = require('./client-auth'),
    apiErrorHandlers = require('./api-error-handlers'),

    middleware,
    blogApp;

function isBlackListedFileType(file) {
    var blackListedFileTypes = ['.hbs', '.md', '.json'],
        ext = path.extname(file);
    return _.contains(blackListedFileTypes, ext);
}

function cacheBlogApp(app) {
    blogApp = app;
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
        redirectPathname: function redirectPathname() {
            var pathname  = baseUrl.path;
            if (reqUrl[0] === '/' && pathname[pathname.length - 1] === '/') {
                pathname += reqUrl.slice(1);
            } else {
                pathname += reqUrl;
            }
            return pathname;
        },
        redirectUrl: function redirectUrl(query) {
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

    return api.settings.read({context: {internal: true}, key: 'password'}).then(function then(response) {
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
    authenticate: function authenticate(req, res, next) {
        var path,
            subPath;

        // SubPath is the url path starting after any default subdirectories
        // it is stripped of anything after the two levels `/ghost/.*?/` as the reset link has an argument
        path = req.path;
        /*jslint regexp:true, unparam:true*/
        subPath = path.replace(/^(\/.*?\/.*?\/)(.*)?/, function replace(match, a) {
            return a;
        });

        if (subPath.indexOf('/ghost/api/') === 0
            && (path.indexOf('/ghost/api/v0.1/authentication/') !== 0
            || (path.indexOf('/ghost/api/v0.1/authentication/') === 0 && req.method === 'PUT'))) {
            return passport.authenticate('bearer', {session: false, failWithError: true},
                function authenticate(err, user, info) {
                    if (err) {
                        return next(err); // will generate a 500 error
                    }
                    // Generate a JSON response reflecting authentication status
                    if (!user) {
                        var error = {
                            code: 401,
                            errorType: 'NoPermissionError',
                            message: 'Please Sign In'
                        };

                        return apiErrorHandlers.errorHandler(error, req, res, next);
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
    whenEnabled: function whenEnabled(setting, fn) {
        return function settingEnabled(req, res, next) {
            // Set from server/middleware/index.js for now
            if (blogApp.enabled(setting)) {
                fn(req, res, next);
            } else {
                next();
            }
        };
    },

    staticTheme: function staticTheme() {
        return function blackListStatic(req, res, next) {
            if (isBlackListedFileType(req.url)) {
                return next();
            }

            return middleware.forwardToExpressStatic(req, res, next);
        };
    },

    // to allow unit testing
    forwardToExpressStatic: function forwardToExpressStatic(req, res, next) {
        api.settings.read({context: {internal: true}, key: 'activeTheme'}).then(function then(response) {
            var activeTheme = response.settings[0];

            express['static'](path.join(config.paths.themePath, activeTheme.value), {maxAge: utils.ONE_YEAR_MS})(req, res, next);
        });
    },

    // Check to see if we should use SSL
    // and redirect if needed
    checkSSL: function checkSSL(req, res, next) {
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

    checkIsPrivate: function checkIsPrivate(req, res, next) {
        return api.settings.read({context: {internal: true}, key: 'isPrivate'}).then(function then(response) {
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

    filterPrivateRoutes: function filterPrivateRoutes(req, res, next) {
        if (res.isAdmin || !res.isPrivateBlog || req.url.lastIndexOf('/private/', 0) === 0) {
            return next();
        }

        // take care of rss and sitemap 404s
        if (req.url.lastIndexOf('/rss', 0) === 0 || req.url.lastIndexOf('/sitemap', 0) === 0) {
            return errors.error404(req, res, next);
        } else if (req.url.lastIndexOf('/robots.txt', 0) === 0) {
            fs.readFile(path.join(config.paths.corePath, 'shared', 'private-robots.txt'), function readFile(err, buf) {
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

    authenticatePrivateSession: function authenticatePrivateSession(req, res, next) {
        var hash = req.session.token || '',
            salt = req.session.salt || '',
            url;

        return verifySessionHash(salt, hash).then(function then(isVerified) {
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
    isPrivateSessionAuth: function isPrivateSessionAuth(req, res, next) {
        if (!res.isPrivateBlog) {
            return res.redirect(config.urlFor('home', true));
        }

        var hash = req.session.token || '',
            salt = req.session.salt || '';

        return verifySessionHash(salt, hash).then(function then(isVerified) {
            if (isVerified) {
                // redirect to home if user is already authenticated
                return res.redirect(config.urlFor('home', true));
            } else {
                return next();
            }
        });
    },

    authenticateProtection: function authenticateProtection(req, res, next) {
        // if errors have been generated from the previous call
        if (res.error) {
            return next();
        }

        var bodyPass = req.body.password;

        return api.settings.read({context: {internal: true}, key: 'password'}).then(function then(response) {
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
    cacheControl: cacheControl,
    spamPrevention: spamPrevention
};

module.exports = middleware;
module.exports.cacheBlogApp = cacheBlogApp;

module.exports.api = {
    addClientSecret: clientAuth.addClientSecret,
    cacheOauthServer: clientAuth.cacheOauthServer,
    authenticateClient: clientAuth.authenticateClient,
    generateAccessToken: clientAuth.generateAccessToken,
    methodNotAllowed: apiErrorHandlers.methodNotAllowed,
    errorHandler: apiErrorHandlers.errorHandler
};

// SSL helper functions are exported primarily for unity testing.
module.exports.isSSLrequired = isSSLrequired;
module.exports.sslForbiddenOrRedirect = sslForbiddenOrRedirect;
