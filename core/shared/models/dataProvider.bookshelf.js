/**
 * Provides access to data via the Bookshelf ORM
 */

/*globals module, require, process */
(function () {
    "use strict";

    var knex = require('./knex_init'),
        PostsProvider = require('./dataProvider.bookshelf.posts'),
        UsersProvider = require('./dataProvider.bookshelf.users'),
        DataProvider,
        instance;

    DataProvider = function () {
        if (!instance) {
            instance = this;
            knex.Schema.hasTable('posts').then(null, function () {
                // Simple boostraping of the data model for now.
                require('../data/migration/001').up().then(function () {
                    console.log('all done....');
                });
            });
        }

        return instance;
    };

    DataProvider.prototype.posts = new PostsProvider();
    DataProvider.prototype.users = new UsersProvider();

    module.exports = DataProvider;
}());