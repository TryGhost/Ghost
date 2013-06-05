/*global require, module */

(function () {
    "use strict";

    var GhostBookshelf = require('./base'),
        knex = GhostBookshelf.Knex;

    module.exports = {
        Post: require('./post').Post,
        User: require('./user').User,
        Role: require('./role').Role,
        Permission: require('./permission').Permission,
        Setting: require('./setting').Setting,
        init: function () {
            return knex.Schema.hasTable('posts').then(null, function () {
                // Simple bootstraping of the data model for now.
                var migration = require('../data/migration/001');
                return migration.down().then(function () {
                    return migration.up();
                });
            }).then(function () {
                console.log('models loaded');
            });
        }
    };

}());