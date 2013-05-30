/**
 * Provides access to data via the Bookshelf ORM
 */

/*globals module, require, process */
(function () {
    "use strict";

    var _ = require('underscore'),
        knex = require('./knex_init'),
        PostsProvider = require('./dataProvider.bookshelf.posts'),
        UsersProvider = require('./dataProvider.bookshelf.users'),
        SettingsProvider = require('./dataProvider.bookshelf.settings'),
        DataProvider,
        instance,
        defaultOptions = {
            autoInit: false
        };

    DataProvider = function (options) {
        options = _.defaults(options || {}, defaultOptions);

        if (!instance) {
            instance = this;

            if (options.autoInit) {
                this.init();
            }
        }

        return instance;
    };

    DataProvider.prototype.init = function () {
        return knex.Schema.hasTable('posts').then(null, function () {
            // Simple bootstraping of the data model for now.
            var migration = require('../data/migration/001');

            return migration.down().then(function () {
                return migration.up();
            });
        }).then(function () {
            console.log('DataProvider ready');
        });
    };

    DataProvider.prototype.posts = new PostsProvider();
    DataProvider.prototype.users = new UsersProvider();
    DataProvider.prototype.settings = new SettingsProvider();

    module.exports = DataProvider;
}());