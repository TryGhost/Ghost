// # Ghost Data API
// Provides access to the data model

/**
 * This is intended to replace the old dataProvider files and should access & manipulate the models directly
 */

/*global module, require */
(function () {
    "use strict";

    var Ghost = require('../ghost'),
        _ = require('underscore'),

        ghost = new Ghost(),
        posts,
        users,
        settings,
        requestHandler;

    // # Posts
    posts = {
        // takes filter / pagination parameters
        // returns a list of posts in a json response
        browse: function (options) {
            return ghost.dataProvider().posts.findAll(options);
        },
        // takes an identifier (id or slug?)
        // returns a single post in a json response
        read: function (args) {
            return ghost.dataProvider().posts.findOne(args);
        },
        // takes a json object with all the properties which should be updated
        // returns the resulting post in a json response
        edit: function (postData) {
            return ghost.dataProvider().posts.edit(postData);
        },
        // takes a json object representing a post,
        // returns the resulting post in a json response
        add: function (postData) {
            return ghost.dataProvider().posts.add(postData);
        },
        // takes an identifier (id or slug?)
        // returns a json response with the id of the deleted post
        destroy: function (args) {
            return ghost.dataProvider().posts.destroy(args.id);
        }
    };

    // # Users
    users = {
        add: function (postData) {
            return ghost.dataProvider().users.add(postData);
        },
        check: function (postData) {
            return ghost.dataProvider().users.check(postData);
        }
    };

    // # Settings
    settings = {
        browse: function (options) {
            return ghost.dataProvider().settings.browse(options);
        },
        read: function (options) {
            return ghost.dataProvider().settings.read(options.key);
        },
        edit: function (options) {
            return ghost.dataProvider().settings.edit(options);
        }
    };

    // categories: {};
    // post_categories: {};


    // requestHandler
    // decorator for api functions which are called via an HTTP request
    // takes the API method and wraps it so that it gets data from the request and returns a sensible JSON response
    requestHandler = function (apiMethod) {
        return function (req, res) {
            var options = _.extend(req.body, req.params);
            return apiMethod(options).then(function (result) {
                res.json(result);
            }, function (error) {
                res.json(400, {error: error});
            });
        };
    };


    module.exports.posts = posts;
    module.exports.users = users;
    module.exports.settings = settings;
    module.exports.requestHandler = requestHandler;
}());