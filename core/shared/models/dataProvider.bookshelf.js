/**
 * Provides access to data via the Bookshelf ORM
 */

/*globals module, require, process */
(function () {
    "use strict";

    var knex = require('./knex_init'),
        PostsProvider = require('./dataProvider.bookshelf.posts'),
        UsersProvider = require('./dataProvider.bookshelf.users'),
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
                var migration = require('../data/migration/001');

                migration.down().then(function() {
                    migration.up().then(function () {
                        console.log('all done....');
                    });
                });
            });
        }

        return instance;
    };

    DataProvider.prototype.posts = new PostsProvider();
    DataProvider.prototype.users = new UsersProvider();

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