/**
 * Provides access to data via the Bookshelf ORM
 */

/*globals module, require, process */
(function () {
    "use strict";

    var knex = require('./knex_init'),
        models = require('./models'),
        DataProvider,
        instance;

    DataProvider = function () {
        if (!instance) {
            instance = this;
            knex.Schema.hasTable('posts').then(null, function () {
                // Simple boostraping of the data model for now.
                require('./../data/migration/001').up().then(function () {
                    console.log('all done....');
                });
            });
        }

        return instance;
    };

    DataProvider.prototype.posts = function () { };

    /**
     * Naive find all
     * @param args
     * @param callback
     */
    DataProvider.prototype.posts.findAll = function (args, callback) {
        models.Posts.forge().fetch().then(function (posts) {
            callback(null, posts);
        }, callback);
    };

    /**
     * Naive find one where args match
     * @param args
     * @param callback
     */
    DataProvider.prototype.posts.findOne = function (args, callback) {
        models.Post.forge(args).fetch().then(function (post) {
            callback(null, post);
        }, callback);
    };

    /**
     * Naive add
     * @param _post
     * @param callback
     */
    DataProvider.prototype.posts.add = function (_post, callback) {
        models.Post.forge(_post).save().then(function (post) {
            callback(null, post);
        }, callback);
    };

    /**
     * Naive edit
     * @param _post
     * @param callback
     */
    DataProvider.prototype.posts.edit = function (_post, callback) {
        models.Post.forge({id: _post.id}).fetch().then(function (post) {
            post.set(_post).save().then(function (post) {
                callback(null, post);
            }, callback);
        });
    };


    DataProvider.prototype.posts.destroy = function (_identifier, callback) {
        models.Post.forge({id: _identifier}).destroy().then(function () {
            callback(null);
        });
    };

    module.exports = DataProvider;
}());