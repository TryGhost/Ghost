/**
 * Provides access to data via the Bookshelf ORM
 */

/*globals module, require, process */
(function () {
    "use strict";

    var knex = require('./knex_init'),
        models = require('./models'),
        bcrypt = require('bcrypt'),
        when = require("when"),
        _ = require("underscore"),
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
    DataProvider.prototype.users = function () { };

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
        console.log(_post);
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
            callback(null, 'ok');
        }, callback);
    };

    /**
     * Naive user add
     * @param  _user
     * @param  callback
     *
     * Could probably do with some refactoring, but it works right now.
     */
    DataProvider.prototype.users.add = function (_user, callback) {
        console.log('outside of forge', _user);
        bcrypt.genSalt(10, function (err, salt) {
            bcrypt.hash(_user.password, salt, function (err, hash) {
                var test = {
                    "password": hash,
                    "email_address": _user.email
                };
                new models.User(test).save().then(function (user) {
                    console.log('within the forge for the user bit', user);
                    callback(null, user);
                }, callback);
            });
        });
    };

    DataProvider.prototype.users.check = function (_userdata, callback) {
        var test = {
            email_address: _userdata.email
        };
        models.User.forge(test).fetch().then(function (user) {
            var _user;
            bcrypt.compare(_userdata.pw, user.attributes.password, function (err, res) {
                if (res) {
                    _user = user;
                } else {
                    _user = false;
                }
                callback(null, _user);
            });
        });
    };

    // ## Settings
    DataProvider.prototype.settings = function () { };

    DataProvider.prototype.settings.browse = function (_args, callback) {
        models.Settings.forge(_args).fetch().then(function (settings) {
            callback(null, settings);
        }, callback);
    };

    DataProvider.prototype.settings.read = function (_key, callback) {
        models.Setting.forge({ key: _key }).fetch().then(function (setting) {
            callback(null, setting);
        }, callback);
    };

    DataProvider.prototype.settings.edit = function (_data, callback) {
        when.all(_.map(_data, function (value, key) {
            return models.Setting.forge({ key: key }).fetch().then(function (setting) {
                return setting.set('value', value).save();
            });
        })).then(function (settings) {
            callback(null, settings);
        }, callback);
    };

    module.exports = DataProvider;
}());