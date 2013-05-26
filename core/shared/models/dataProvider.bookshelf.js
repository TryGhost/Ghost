/**
 * Provides access to data via the Bookshelf ORM
 */

/*globals module, require, process */
(function () {
    "use strict";

    var knex = require('./knex_init'),
        PostsProvider = require('./dataProvider.bookshelf.posts'),
        UsersProvider = require('./dataProvider.bookshelf.users'),
        SettingsProvider = require('./dataProvider.bookshelf.settings'),
        DataProvider,
        instance;

    DataProvider = function () {
        if (!instance) {
            instance = this;
            knex.Schema.hasTable('posts').then(null, function () {
                // Simple bootstraping of the data model for now.
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
    DataProvider.prototype.settings = new SettingsProvider();

    module.exports = DataProvider;
}());