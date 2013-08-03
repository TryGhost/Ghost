var when    = require('when'),
    knex    = require('../../models/base').Knex,
    migrationVersion = '002',
    fixtures = require('../fixtures/' + migrationVersion),
    errors = require('../../errorHandling'),
    up,
    down;

up = function () {

    return when.all([

        knex.Schema.createTable('tags', function (t) {
            t.increments().primary();
            t.string('uuid');
            t.string('name');
            t.string('slug');
            t.text('descripton');
            t.integer('parent_id').nullable();
            t.string('meta_title');
            t.text('meta_description');
            t.string('meta_keywords');
            t.dateTime('created_at');
            t.integer('created_by');
            t.dateTime('updated_at').nullable();
            t.integer('updated_by').nullable();
        }),
        knex.Schema.createTable('posts_tags', function (t) {
            t.increments().primary();
            t.string('uuid');
            t.integer('post_id');
            t.integer('tag_id');
        }),
        knex.Schema.createTable('custom_data', function (t) {
            t.increments().primary();
            t.string('uuid');
            t.string('name');
            t.string('slug');
            t.text('value');
            t.string('type').defaultTo('html');
            t.string('owner').defaultTo('Ghost');
            t.string('meta_title');
            t.text('meta_description');
            t.string('meta_keywords');
            t.dateTime('created_at');
            t.integer('created_by');
            t.dateTime('updated_at').nullable();
            t.integer('updated_by').nullable();
        }),
        knex.Schema.createTable('posts_custom_data', function (t) {
            t.increments().primary();
            t.string('uuid');
            t.integer('post_id');
            t.integer('custom_data_id');
        }),
        knex.Schema.table('users', function (t) {
            t.string('location').after('bio');
        })

    ]).then(function () {

        // Once we create all of the initial tables, bootstrap any of the data
        return when.all([
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
    return when.all([
        knex.Schema.dropTableIfExists("tags"),
        knex.Schema.dropTableIfExists("custom_data")
    ]).then(function () {
        // Drop the relation tables after the model tables?
        return when.all([
            knex.Schema.dropTableIfExists("posts_tags"),
            knex.Schema.dropTableIfExists("posts_custom_data")
        ]);
    });
};

exports.up = up;
exports.down = down;