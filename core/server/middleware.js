
var _           = require('underscore'),
    express     = require('express'),
    Ghost       = require('../ghost'),
    path        = require('path'),
    ghost       = new Ghost();

function isBlackListedFileType(file) {
    var blackListedFileTypes = ['.hbs', '.md', '.json'],
        ext = path.extname(file);
    return _.contains(blackListedFileTypes, ext);
}

var middleware = {

    // ### Auth Middleware
    // Authenticate a request by redirecting to login if not logged in.
    // We strip /ghost/ out of the redirect parameter for neatness
    auth: function (req, res, next) {
        if (!req.session.user) {
            var path = req.path.replace(/^\/ghost\/?/gi, ''),
                redirect = '',
                msg;

            if (path !== '') {
                msg = {
                    type: 'error',
                    message: 'Please Sign In',
                    status: 'passive',
                    id: 'failedauth'
                };
                // let's only add the notification once
                if (!_.contains(_.pluck(ghost.notifications, 'id'), 'failedauth')) {
                    ghost.notifications.push(msg);
                }
                redirect = '?r=' + encodeURIComponent(path);
            }
            return res.redirect('/ghost/signin/' + redirect);
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
            return res.redirect('/ghost/');
        }

        next();
    },

    // While we're here, let's clean up on aisle 5
    // That being ghost.notifications, and let's remove the passives from there
    // plus the local messages, as they have already been added at this point
    // otherwise they'd appear one too many times
    cleanNotifications: function (req, res, next) {
        /*jslint unparam:true*/
        ghost.notifications = _.reject(ghost.notifications, function (notification) {
            return notification.status === 'passive';
        });
        next();
    },

    // ### DisableCachedResult Middleware
    // Disable any caching until it can be done properly
    disableCachedResult: function (req, res, next) {
        /*jslint unparam:true*/
        res.set({
            'Cache-Control': 'no-cache, must-revalidate',
            'Expires': 'Sat, 26 Jul 1997 05:00:00 GMT'
        });

        next();
    },

    // ### whenEnabled Middleware
    // Selectively use middleware
    // From https://github.com/senchalabs/connect/issues/676#issuecomment-9569658
    whenEnabled: function (setting, fn) {
        return function settingEnabled(req, res, next) {
            if (ghost.server.enabled(setting)) {
                fn(req, res, next);
            } else {
                next();
            }
        };
    },

    staticTheme: function (g) {
        var ghost = g;
        return function blackListStatic(req, res, next) {
            if (isBlackListedFileType(req.url)) {
                return next();
            }

            return middleware.forwardToExpressStatic(ghost, req, res, next);
        };
    },

    // to allow unit testing
    forwardToExpressStatic: function (ghost, req, res, next) {
        return express['static'](ghost.paths().activeTheme)(req, res, next);
    }
};

module.exports = middleware;
