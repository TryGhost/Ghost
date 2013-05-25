/**
 * Provides access to data via the Bookshelf ORM
 */

/*globals module, require, process */
(function () {
    "use strict";

    var knex = require('./knex_init'),
        models = require('./models'),
        bcrypt = require('bcrypt'),
        when = require('when'),
        nodefn = require('when/node/function'),
        _ = require('underscore'),
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
     */
    DataProvider.prototype.posts.findAll = function (args) {
        return models.Posts.forge().fetch();
    };

    /**
     * Naive find one where args match
     * @param args
     */
    DataProvider.prototype.posts.findOne = function (args) {
        return models.Post.forge(args).fetch();
    };

    /**
     * Naive add
     * @param _post
     */
    DataProvider.prototype.posts.add = function (_post) {
        console.log(_post);
        return models.Post.forge(_post).save();
    };

    /**
     * Naive edit
     * @param _post
     */
    DataProvider.prototype.posts.edit = function (_post) {
        return models.Post.forge({id: _post.id}).fetch().then(function (post) {
            return post.set(_post).save();
        });
    };


    DataProvider.prototype.posts.destroy = function (_identifier) {
        return models.Post.forge({id: _identifier}).destroy().yield('ok');
    };

    /**
     * Naive user add
     * @param  _user
     *
     * Could probably do with some refactoring, but it works right now.
     */
    DataProvider.prototype.users.add = function (_user) {
        console.log('outside of forge', _user);

        return nodefn.call(bcrypt.hash, _user.password, 10).then(function(hashed) {
            return new models.User({
                password: hashed,
                email_address: _user.email
            }).save();
        });
    };

    DataProvider.prototype.users.check = function (_userdata) {
        return models.User.forge({
            email_address: _userdata.email
        }, {require: true})
        .fetch()
        .then(function (user) {
            return nodefn.call(bcrypt.compare, _userdata.pw, user.attributes.password)
                .then(function(res) {
                    if (!res) return when.reject(new Error('Password does not match'));
                    return user;
                });
        });
    };

    // ## Settings
    DataProvider.prototype.settings = function () { };

    DataProvider.prototype.settings.browse = function (_args) {
        return models.Settings.forge(_args).fetch();
    };

    DataProvider.prototype.settings.read = function (_key) {
        return models.Setting.forge({ key: _key }).fetch();
    };

    DataProvider.prototype.settings.edit = function (_data) {
        return when.all(_.map(_data, function (value, key) {
            return models.Setting.forge({ key: key }).fetch().then(function (setting) {
                return setting.set('value', value).save();
            });
        }));
    };

    module.exports = DataProvider;
}());