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
        dataProvider = ghost.dataProvider,
        posts,
        users,
        settings,
        requestHandler;

    // # Posts
    posts = {
        // takes filter / pagination parameters
        // returns a page of posts in a json response
        browse: function (options) {
            return dataProvider.Post.findPage(options);
        },
        // takes an identifier (id or slug?)
        // returns a single post in a json response
        read: function (args) {
            return dataProvider.Post.findOne(args);
        },
        // takes a json object with all the properties which should be updated
        // returns the resulting post in a json response
        edit: function (postData) {
            return dataProvider.Post.edit(postData);
        },
        // takes a json object representing a post,
        // returns the resulting post in a json response
        add: function (postData) {
            return dataProvider.Post.add(postData);
        },
        // takes an identifier (id or slug?)
        // returns a json response with the id of the deleted post
        destroy: function (args) {
            return dataProvider.Post.destroy(args.id);
        }
    };

    // # Users
    users = {
        add: function (postData) {
            return dataProvider.User.add(postData);
        },
        check: function (postData) {
            return dataProvider.User.check(postData);
        }
    };

    // # Settings
    settings = {
        browse: function (options) {
            return dataProvider.Setting.browse(options);
        },
        read: function (options) {
            return dataProvider.Setting.read(options.key);
        },
        edit: function (options) {
            return dataProvider.Setting.edit(options);
        }
    };

    // categories: {};
    // post_categories: {};


    // requestHandler
    // decorator for api functions which are called via an HTTP request
    // takes the API method and wraps it so that it gets data from the request and returns a sensible JSON response
    requestHandler = function (apiMethod) {
        return function (req, res) {
            var options = _.extend(req.body, req.query, req.params);
            return apiMethod(options).then(function (result) {
                res.json(result || {});
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