var when    = require('when'),
    knex    = require('../../models/base').Knex,
    migrationVersion = '002',
    fixtures = require('../fixtures/' + migrationVersion),
    errors = require('../../errorHandling'),
    up,
    down;

up = function () {

    return when.all([

        // TODO: Create tables or modify tables in this general area

    ]).then(function () {

        // Once we create all of the initial tables, bootstrap any of the data

        return when.all([
            //knex('posts').insert(fixtures.posts),
            //knex('roles').insert(fixtures.roles),
            //knex('permissions').insert(fixtures.permissions),
            //knex('permissions_roles').insert(fixtures.permissions_roles),
            knex('settings').insert(fixtures.settings)
        ]);

    }).then(function () {

        // Lastly, update the current version settings to reflect this version
        return knex('settings')
            .where('key', 'currentVersion')
            .update({ 'value': migrationVersion });
    });
};

down = function () {
    return;
};

exports.up = up;
exports.down = down;