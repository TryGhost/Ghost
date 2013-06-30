var GhostBookshelf = require('./base'),
    errors = require('../errorHandling'),
    knex = GhostBookshelf.Knex;

module.exports = {
    Post: require('./post').Post,
    User: require('./user').User,
    Role: require('./role').Role,
    Permission: require('./permission').Permission,
    Settings: require('./settings').Settings,
    init: function () {
        return knex.Schema.hasTable('posts').then(null, function () {
            // Simple bootstraping of the data model for now.
            var migration = require('../data/migration/001');
            return migration.down().then(function () {
                return migration.up();
            }, errors.logAndThrowError);
        }, errors.logAndThrowError);
    }
};
