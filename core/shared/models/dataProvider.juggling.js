/**
 * Provides access to data via the JugglingDb ORM
 */

/*globals module, require */
(function () {
    "use strict";

    var schema = require('./schema').schema,
        fs = require('fs'),
        _ =  require('underscore'),
        DataProvider,
        instance;


    function populateData(callback) {
        // TODO: convert to promises
        schema.models.Setting.findOne({}, function (error, data) {
            if (data === null) {
                // we haven't loaded any data yet
                fs.readFile(__dirname + '/data/fixtures/users.json', function (error, data) {
                    if (error) {
                        throw error;
                    }

                    var users = JSON.parse(data);

                    _.each(users, function (post) {
                        schema.models.User.create(post, function (error, data) {
                            console.log('User created error', error);
                            console.log('User created data', data);
                        });
                    });

                    fs.readFile(__dirname + '/data/fixtures/posts.json', function (error, data) {
                        if (error) {
                            throw error;
                        }

                        var posts = JSON.parse(data),
                            post;

                        _.each(posts, function (_post) {
                            post = new schema.models.Post(_post);

                            post.preCreate(function () {
                                post.save(function (error, data) {
                                    console.log('Post created error', error);
                                    console.log('Post created data', data);
                                });
                            });
                        });

                        fs.readFile(__dirname + '/data/fixtures/settings.json', function (error, data) {
                            if (error) {
                                throw error;
                            }

                            var posts = JSON.parse(data);

                            _.each(posts, function (post) {
                                schema.models.Setting.create(post, function (error, data) {
                                    console.log('Setting created error', error);
                                    console.log('Setting created data', data);
                                });
                            });

                            callback();
                        });
                    });


                });
            } else {
                callback();
            }
        });
    }

    DataProvider = function () {
        if (!instance) {
            instance = this;

            if (process.env.forcePopulate) {
                populateData();
            }
        }

        return instance;
    };

    DataProvider.prototype.posts = function () {};

    /**
     * Naive find all
     * @param callback
     */
    DataProvider.prototype.posts.findAll = function (callback) {
        schema.models.Post.all(callback);
    };

    /**
     * Naive find one where args match
     * @param callback
     */
    DataProvider.prototype.posts.findOne = function (args, callback) {
        schema.models.Post.findOne({where: args}, callback);
    };

    /**
     * Naive add
     * @param post
     * @param callback
     */
    DataProvider.prototype.posts.add = function (_post, callback) {
        var post = new schema.models.Post(_post);

        post.preCreate(function () {
            post.save(callback);
        });
    };

    /**
     * Naive edit
     * @param post
     * @param callback
     */
    DataProvider.prototype.posts.edit = function (_post, callback) {
        schema.models.Post.findOne({where: {id: _post.id}}, function (error, post) {
            post = _.extend(post, _post);

            schema.models.Post.updateOrCreate(post, callback);
        });
    };

    DataProvider.prototype.populateData = populateData;

    module.exports = DataProvider;
}());