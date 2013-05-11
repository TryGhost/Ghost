(function () {
    "use strict";

    var Ghost = require('../../ghost'),
        _ = require('underscore'),
        fs = require('fs'),
        Showdown = require('showdown'),
        converter = new Showdown.converter(),

        ghost = new Ghost(),
        adminNavbar,
        adminControllers;

     // TODO: combine path/navClass to single "slug(?)" variable with no prefix
    adminNavbar = {
        dashboard: {
            name: 'Dashboard',
            navClass: 'dashboard',
            key: 'admin.navbar.dashboard',
            defaultString: 'dashboard',
            path: ''
        },
        blog: {
            name: 'Content',
            navClass: 'content',
            key: 'admin.navbar.blog',
            defaultString: 'blog',
            path: '/blog'
        },
        add: {
            name: 'New Post',
            navClass: 'editor',
            key: 'admin.navbar.editor',
            defaultString: 'editor',
            path: '/editor'
        },
        settings: {
            name: 'Settings',
            navClass: 'settings',
            key: 'admin.navbar.settings',
            defaultString: 'settings',
            path: '/settings'
        }
    };

    // TODO - make this a util or helper
    function setSelected(list, name) {
        _.each(list, function (item, key) {
            item.selected = key === name;
        });
        return list;
    }

    adminControllers = {
        'index': function (req, res) {
            res.render('dashboard', {
                bodyClass: 'dashboard',
                adminNav: setSelected(adminNavbar, 'dashboard')
            });
        },
        'editor': function (req, res) {
            if (req.params.id !== undefined) {
                ghost.dataProvider().posts.findOne({'id': parseInt(req.params.id, 10)}, function (error, post) {
                    res.render('editor', {
                        bodyClass: 'editor',
                        adminNav: setSelected(adminNavbar, 'blog'),
                        title: post.title,
                        content: post.content
                    });
                });
            } else {
                res.render('editor', {
                    bodyClass: 'editor',
                    adminNav: setSelected(adminNavbar, 'add')
                });
            }
        },
        'blog': function (req, res) {
            ghost.dataProvider().posts.findAll(function (error, posts) {
                res.render('blog', {
                    bodyClass: 'manage',
                    adminNav: setSelected(adminNavbar, 'blog'),
                    posts: posts
                });
            });
        },
        'settings': function (req, res) {
            res.render('settings', {
                bodyClass: 'settings',
                adminNav: setSelected(adminNavbar, 'settings')
            });
        },
        'debug': { /* ugly temporary stuff for managing the app before it's properly finished */
            index: function (req, res) {
                res.render('debug', {
                    bodyClass: 'settings',
                    adminNav: setSelected(adminNavbar, 'settings'),
                    messages: req.flash(),
                    test: 'Hello world'
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
                ghost.dataProvider().populateData(function (error) {
                    if (error) {
                        req.flash('error', error);
                    } else {
                        req.flash('success', 'Data populated');
                    }
                    res.redirect('/ghost/debug');
                });
            }
        },
        'posts': {
            'index': function (req, res) {

            },
            'create': function (req, res) {
                var entry = {
                    title: req.body.title,
                    content: req.body.markdown,
                    contentHtml: '',
                    language: ghost.config().defaultLang,
                    status: ghost.statuses().draft,
                    featured: false
                };

                entry.contentHtml = converter.makeHtml(entry.content);

                ghost.dataProvider().posts.add(entry, function (error, post) {
                    if (!error) {
                        console.log('added', post);
                        res.json({id: post.id});
                    } else {
                        res.json(400, {error: post.errors});
                    }
                });
            },
            'edit': function (req, res) {
                var entry = {
                    id: parseInt(req.body.id, 10),
                    title: req.body.title,
                    content: req.body.markdown,
                    contentHtml: ''
                };

                entry.contentHtml = converter.makeHtml(entry.content);

                ghost.dataProvider().posts.edit(entry, function (error, post) {
                    console.log('edited', post);
                    res.json({id: parseInt(post.id, 10)});
                });
            }
        }
    };

    module.exports = adminControllers;
}());