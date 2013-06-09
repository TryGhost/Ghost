/*global require, module */
(function () {
    "use strict";

    var Ghost = require('../../ghost'),
        _ = require('underscore'),
        fs = require('fs'),
        api = require('../../shared/api'),

        ghost = new Ghost(),
        dataProvider = ghost.dataProvider,
        adminNavbar,
        adminControllers;

     // TODO: combine path/navClass to single "slug(?)" variable with no prefix
    adminNavbar = {
        dashboard: {
            name: 'Dashboard',
            navClass: 'dashboard',
            key: 'admin.navbar.dashboard',
            // defaultString: 'dashboard',
            path: '/'
        },
        content: {
            name: 'Content',
            navClass: 'content',
            key: 'admin.navbar.content',
            // defaultString: 'content',
            path: '/content/'
        },
        add: {
            name: 'New Post',
            navClass: 'editor',
            key: 'admin.navbar.editor',
            // defaultString: 'editor',
            path: '/editor/'
        },
        settings: {
            name: 'Settings',
            navClass: 'settings',
            key: 'admin.navbar.settings',
            // defaultString: 'settings',
            path: '/settings/'
        }
    };

    ghost.doFilter('messWithAdmin', adminNavbar, function () {
        console.log('the dofilter hook called in /core/admin/controllers/index.js');
    });

    // TODO - make this a util or helper
    function setSelected(list, name) {
        _.each(list, function (item, key) {
            item.selected = key === name;
        });
        return list;
    }

    adminControllers = {
        'login': function (req, res) {
            res.render('login', {
                bodyClass: 'ghost-login',
                hideNavbar: true,
                adminNav: setSelected(adminNavbar, 'login')
            });
        },
        'auth': function (req, res) {
            api.users.check({email: req.body.email, pw: req.body.password}).then(function (user) {
                console.log('user found: ', user);
                req.session.user = "ghostadmin";
                res.redirect(req.query.redirect || '/ghost/');
            }, function (error) {
                // Do something here to signal the reason for an error
                req.flash('error', error.message);
                res.redirect('/ghost/login/');
            });
        },
        'register': function (req, res) {
            res.render('register', {
                bodyClass: 'ghost-login',
                hideNavbar: true,
                adminNav: setSelected(adminNavbar, 'login')
            });
        },
        'doRegister': function (req, res) {
            var email = req.body.email_address,
                password = req.body.password;

            if (email !== '' && password.length > 5) {
                api.users.add({
                    email_address: email,
                    password: password
                }).then(function (user) {
                    console.log('user added', user);
                    res.redirect('/ghost/login/');
                }, function (error) {
                    req.flash('error', error.message);
                    res.redirect('/ghost/register/');
                });
            } else {
                req.flash('error', "The password is too short. Have at least 6 characters in there");
                res.redirect('back');
            }
        },
        'logout': function (req, res) {
            delete req.session.user;
            req.flash('success', "You were successfully logged out");
            res.redirect('/ghost/login/');
        },
        'index': function (req, res) {
            res.render('dashboard', {
                bodyClass: 'dashboard',
                adminNav: setSelected(adminNavbar, 'dashboard')
            });
        },
        'editor': function (req, res) {
            if (req.params.id !== undefined) {
                api.posts.read({id: parseInt(req.params.id, 10)})
                    .then(function (post) {
                        res.render('editor', {
                            bodyClass: 'editor',
                            adminNav: setSelected(adminNavbar, 'content'),
                            title: post.get('title'),
                            content: post.get('content')
                        });
                    });
            } else {
                res.render('editor', {
                    bodyClass: 'editor',
                    adminNav: setSelected(adminNavbar, 'add')
                });
            }
        },
        'content': function (req, res) {
            api.posts.browse({status: req.params.status || 'all'})
                .then(function (page) {
                    res.render('content', {
                        bodyClass: 'manage',
                        adminNav: setSelected(adminNavbar, 'content'),
                        posts: page.posts
                    });
                });
        },
        'settings': function (req, res) {
            api.settings.browse()
                .then(function (settings) {
                    res.render('settings', {
                        bodyClass: 'settings',
                        adminNav: setSelected(adminNavbar, 'settings'),
                        settings: settings
                    });
                });
        },
        'debug': { /* ugly temporary stuff for managing the app before it's properly finished */
            index: function (req, res) {
                res.render('debug', {
                    bodyClass: 'settings',
                    adminNav: setSelected(adminNavbar, 'settings')
                });
            },
            'dbdelete': function (req, res) {
                fs.writeFile(__dirname + '/../ghost/data/datastore.db', '', function (error) {
                    if (error) {
                        req.flash('error', error);
                    } else {
                        req.flash('success', 'Everything got deleted');
                    }
                    res.redirect('/ghost/debug');
                });
            },
            'dbpopulate': function (req, res) {
                dataProvider.populateData(function (error) {
                    if (error) {
                        req.flash('error', error);
                    } else {
                        req.flash('success', 'Data populated');
                    }
                    res.redirect('/ghost/debug');
                });
            },
            'newUser': function (req, res) {
                dataProvider.addNewUser(req, function (error) {
                    if (error) {
                        req.flash('error', error);
                    } else {
                        req.flash('success', 'User Added');
                    }
                });
            }
        }
    };

    module.exports = adminControllers;
}());