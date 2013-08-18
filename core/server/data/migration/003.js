var when    = require('when'),
    knex    = require('../../models/base').Knex,
    _ = require('underscore'),
    migrationVersion = '003',
    fixtures = require('../fixtures/' + migrationVersion),
    errors = require('../../errorHandling'),
    up,
    down,
    // TODO: Load from db?
    adminRoleId = 1;

up = function () {

    return when.all([

        // TODO: Table creation goes here

    ]).then(function () {

        // TODO: Insert/update any data here
        return when.resolve();

    }).then(function () {

        // Lastly, update the current version settings to reflect this version
        return knex('settings')
            .where('key', 'currentVersion')
            .update({ 'value': migrationVersion });
    });
};

down = function () {
    return when.all([
        // TODO: Drop any tables here
    ]);
};

exports.up = up;
exports.down = down;