var Ghost         = require('../../ghost'),
    config        = require('../config'),
    _             = require('underscore'),
    path          = require('path'),
    when          = require('when'),
    api           = require('../api'),
    errors        = require('../errorHandling'),
    storage       = require('../storage'),

    ghost         = new Ghost(),
    dataProvider  = ghost.dataProvider,
    adminNavbar,
    adminControllers,
    loginSecurity = [];

 // TODO: combine path/navClass to single "slug(?)" variable with no prefix
adminNavbar = {
    content: {
        name: 'Content',
        navClass: 'content',
        key: 'admin.navbar.content',
        path: '/'
    },
    add: {
        name: 'New Post',
        navClass: 'editor',
        key: 'admin.navbar.editor',
        path: '/editor/'
    },
    settings: {
        name: 'Settings',
        navClass: 'settings',
        key: 'admin.navbar.settings',
        path: '/settings/'
    }
};


// TODO: make this a util or helper
function setSelected(list, name) {
    _.each(list, function (item, key) {
        item.selected = key === name;
    });
    return list;
}

adminControllers = {
    'uploader': function (req, res) {
        var type = req.files.uploadimage.type,
            ext = path.extname(req.files.uploadimage.name).toLowerCase(),
            store = storage.get_storage();

        if ((type !== 'image/jpeg' && type !== 'image/png' && type !== 'image/gif' && type !== 'image/svg+xml')
                || (ext !== '.jpg' && ext !== '.jpeg' && ext !== '.png' && ext !== '.gif' && ext !== '.svg' && ext !== '.svgz')) {
            return res.send(415, 'Unsupported Media Type');
        }

        store
            .save(req.files.uploadimage)
            .then(function (url) {
                return res.send(url);
            })
            .otherwise(function (e) {
                return errors.logError(e);
            });
    },
    'login': function (req, res) {
        /*jslint unparam:true*/
        res.render('login', {
            bodyClass: 'ghost-login',
            hideNavbar: true,
            adminNav: setSelected(adminNavbar, 'login')
        });
    },
    'auth': function (req, res) {
        var currentTime = process.hrtime()[0],
            denied = '';
        loginSecurity = _.filter(loginSecurity, function (ipTime) {
            return (ipTime.time + 2 > currentTime);
        });
        denied = _.find(loginSecurity, function (ipTime) {
            return (ipTime.ip === req.connection.remoteAddress);
        });

        if (!denied) {
            loginSecurity.push({ip: req.connection.remoteAddress, time: process.hrtime()[0]});
            api.users.check({email: req.body.email, pw: req.body.password}).then(function (user) {
                req.session.regenerate(function (err) {
                    if (!err) {
                        req.session.user = user.id;
                        res.json(200, {redirect: req.body.redirect ? '/ghost/'
                            + decodeURIComponent(req.body.redirect) : '/ghost/'});
                    }
                });
            }, function (error) {
                res.json(401, {error: error.message});
            });
        } else {
            res.json(401, {error: 'Slow down, there are way too many login attempts!'});
        }
    },
    'changepw': function (req, res) {
        return api.users.changePassword({
            currentUser: req.session.user,
            oldpw: req.body.password,
            newpw: req.body.newpassword,
            ne2pw: req.body.ne2password
        }).then(function () {
            res.json(200, {msg: 'Password changed successfully'});
        }, function (error) {
            res.send(401, {error: error.message});
        });
    },
    'signup': function (req, res) {
        /*jslint unparam:true*/
        res.render('signup', {
            bodyClass: 'ghost-signup',
            hideNavbar: true,
            adminNav: setSelected(adminNavbar, 'login')
        });
    },
    'doRegister': function (req, res) {
        var name = req.body.name,
            email = req.body.email,
            password = req.body.password;

        api.users.add({
            name: name,
            email: email,
            password: password
        }).then(function (user) {
            api.settings.edit('email', email).then(function () {
                req.session.regenerate(function (err) {
                    if (!err) {
                        if (req.session.user === undefined) {
                            req.session.user = user.id;
                        }
                        res.json(200, {redirect: '/ghost/'});
                    }
                });
            });
        }).otherwise(function (error) {
            res.json(401, {error: error.message});
        });
    },
    'forgotten': function (req, res) {
        /*jslint unparam:true*/
        res.render('forgotten', {
            bodyClass: 'ghost-forgotten',
            hideNavbar: true,
            adminNav: setSelected(adminNavbar, 'login')
        });
    },
    'generateResetToken': function (req, res) {
        var email = req.body.email;

        api.users.generateResetToken(email).then(function (token) {
            var siteLink = '<a href="' + config().url + '">' + config().url + '</a>',
                resetUrl = config().url + '/ghost/reset/' + token + '/',
                resetLink = '<a href="' + resetUrl + '">' + resetUrl + '</a>',
                message = {
                    to: email,
                    subject: 'Reset Password',
                    html: '<p><strong>Hello!</strong></p>' +
                          '<p>A request has been made to reset the password on the site ' + siteLink + '.</p>' +
                          '<p>Please follow the link below to reset your password:<br><br>' + resetLink + '</p>' +
                          '<p>Ghost</p>'
                };

            return ghost.mail.send(message);
        }).then(function success() {
            var notification = {
                type: 'success',
                message: 'Check your email for further instructions',
                status: 'passive',
                id: 'successresetpw'
            };

            return api.notifications.add(notification).then(function () {
                res.json(200, {redirect: '/ghost/signin/'});
            });

        }, function failure(error) {
            // TODO: This is kind of sketchy, depends on magic string error.message from Bookshelf.
            // TODO: It's debatable whether we want to just tell the user we sent the email in this case or not, we are giving away sensitive info here.
            if (error && error.message === 'EmptyResponse') {
                error.message = "Invalid email address";
            }

            res.json(401, {error: error.message});
        });
    },
    'reset': function (req, res) {
        // Validate the request token
        var token = req.params.token;

        api.users.validateToken(token).then(function () {
            // Render the reset form
            res.render('reset', {
                bodyClass: 'ghost-reset',
                hideNavbar: true,
                adminNav: setSelected(adminNavbar, 'reset')
            });
        }).otherwise(function (err) {
            // Redirect to forgotten if invalid token
            var notification = {
                type: 'error',
                message: 'Invalid or expired token',
                status: 'persistent',
                id: 'errorinvalidtoken'
            };

            errors.logError(err, 'admin.js', "Please check the provided token for validity and expiration.");

            return api.notifications.add(notification).then(function () {
                res.redirect('/ghost/forgotten');
            });
        });
    },
    'resetPassword': function (req, res) {
        var token = req.params.token,
            newPassword = req.param('newpassword'),
            ne2Password = req.param('ne2password');

        api.users.resetPassword(token, newPassword, ne2Password).then(function () {
            var notification = {
                type: 'success',
                message: 'Password changed successfully.',
                status: 'passive',
                id: 'successresetpw'
            };

            return api.notifications.add(notification).then(function () {
                res.json(200, {redirect: '/ghost/signin/'});
            });
        }).otherwise(function (err) {
            // TODO: Better error message if we can tell whether the passwords didn't match or something
            res.json(401, {error: err.message});
        });
    },
    'logout': function (req, res) {
        req.session.destroy();
        var notification = {
            type: 'success',
            message: 'You were successfully signed out',
            status: 'passive',
            id: 'successlogout'
        };

        return api.notifications.add(notification).then(function () {
            res.redirect('/ghost/signin/');
        });
    },
    'index': function (req, res) {
        /*jslint unparam:true*/
        res.render('content', {
            bodyClass: 'manage',
            adminNav: setSelected(adminNavbar, 'content')
        });
    },
    'editor': function (req, res) {
        if (req.params.id !== undefined) {
            res.render('editor', {
                bodyClass: 'editor',
                adminNav: setSelected(adminNavbar, 'content')
            });
        } else {
            res.render('editor', {
                bodyClass: 'editor',
                adminNav: setSelected(adminNavbar, 'add')
            });
        }
    },
    'content': function (req, res) {
        /*jslint unparam:true*/
        res.render('content', {
            bodyClass: 'manage',
            adminNav: setSelected(adminNavbar, 'content')
        });
    },
    'settings': function (req, res, next) {

        // TODO: Centralise list/enumeration of settings panes, so we don't
        // run into trouble in future.
        var allowedSections = ['', 'general', 'user'],
            section = req.url.replace(/(^\/ghost\/settings[\/]*|\/$)/ig, '');

        if (allowedSections.indexOf(section) < 0) {
            return next();
        }

        res.render('settings', {
            bodyClass: 'settings',
            adminNav: setSelected(adminNavbar, 'settings')
        });
    },
    'debug': { /* ugly temporary stuff for managing the app before it's properly finished */
        index: function (req, res) {
            /*jslint unparam:true*/
            res.render('debug', {
                bodyClass: 'settings',
                adminNav: setSelected(adminNavbar, 'settings')
            });
        }
    }
};

module.exports = adminControllers;
