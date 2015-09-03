var _           = require('lodash'),
    fs          = require('fs'),
    config      = require('../config'),
    crypto      = require('crypto'),
    path        = require('path'),
    api         = require('../api'),
    Promise     = require('bluebird'),
    errors      = require('../errors'),
    session     = require('cookie-session'),
    utils       = require('../utils'),
    private;

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

private = {
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
            return private.authenticatePrivateSession(req, res, next);
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
    }
};

module.exports = private;
