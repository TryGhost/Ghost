var when    = require('when'),
    _       = require('underscore'),
    knex    = require('../../models/base').Knex,
    migrationVersion = '003',
    fixtures = require('../fixtures/' + migrationVersion),
    errors = require('../../errorHandling'),
    up,
    down;

up = function up() {

    return when.all([

        knex('posts')
            .whereNull('language')
            .orWhere('language', 'en')
            .update({
                'language': 'en_US'
            }),

        knex('posts')
            .whereNull('featured')
            .update({
                'featured': false
            })

    ]).then(function incrementVersion() {

        // Lastly, update the current version settings to reflect this version
        return knex('settings')
            .where('key', 'currentVersion')
            .update({ 'value': migrationVersion });

    });
};

down = function down() {

    return when.all([

        // No new tables as of yet, so just return a wrapped value
        when(true)

    ]);

};

exports.up = up;
exports.down = down;