var when    = require('when'),
    knex    = require('../../models/base').Knex,
    fixtures = require('../fixtures/001'),
    up,
    down;

up = function () {

    return when.all([

        knex.Schema.createTable('posts', function (t) {
            t.increments().primary();
            t.string('uuid');
            t.string('title');
            t.string('slug');
            t.text('content_raw');
            t.text('content');
            t.string('meta_title').nullable();
            t.string('meta_description').nullable();
            t.string('meta_keywords').nullable();
            t.bool('featured').defaultTo(false);
            t.string('image').nullable();
            t.string('status');
            t.string('language').defaultTo('en_US');
            t.integer('author_id');
            t.dateTime('created_at');
            t.integer('created_by');
            t.dateTime('updated_at').nullable();
            t.integer('updated_by').nullable();
            t.dateTime('published_at').nullable();
            t.integer('published_by').nullable();
        }),

        knex.Schema.createTable('users', function (t) {
            t.increments().primary();
            t.string('uuid');
            t.string('full_name');
            t.string('password');
            t.string('email_address');
            t.string('profile_picture');
            t.string('cover_picture');
            t.text('bio');
            t.string('url');
            t.dateTime('created_at');
            t.integer('created_by');
            t.dateTime('updated_at');
            t.integer('updated_by');
        }),

        knex.Schema.createTable('roles', function (t) {
            t.increments().primary();
            t.string('name');
            t.string('description');
        }),

        knex.Schema.createTable('roles_users', function (t) {
            t.increments().primary();
            t.integer('role_id');
            t.integer('user_id');
        }),

        knex.Schema.createTable('permissions', function (t) {
            t.increments().primary();
            t.string('name');
            t.string('object_type');
            t.string('action_type');
            t.integer('object_id');
        }),

        knex.Schema.createTable('permissions_users', function (t) {
            t.increments().primary();
            t.integer('user_id');
            t.integer('permission_id');
        }),

        knex.Schema.createTable('permissions_roles', function (t) {
            t.increments().primary();
            t.integer('role_id');
            t.integer('permission_id');
        }),

        knex.Schema.createTable('settings', function (t) {
            t.increments().primary();
            t.string('uuid');
            t.string('key').unique();
            t.text('value');
            t.string('type');
            t.dateTime('created_at');
            t.integer('created_by');
            t.dateTime('updated_at');
            t.integer('updated_by');
        })

    // Once we create all of the initial tables, bootstrap any of the data
    ]).then(function () {

        return when.all([
            knex('posts').insert(fixtures.posts),
            // knex('users').insert(fixtures.users),
            knex('roles').insert(fixtures.roles),
            // knex('roles_users').insert(fixtures.roles_users),
            knex('permissions').insert(fixtures.permissions),
            knex('permissions_roles').insert(fixtures.permissions_roles),
            knex('settings').insert(fixtures.settings)
        ]);

    });
};

down = function () {
    return when.all([
        knex.Schema.dropTableIfExists("posts"),
        knex.Schema.dropTableIfExists("users"),
        knex.Schema.dropTableIfExists("roles"),
        knex.Schema.dropTableIfExists("settings"),
        knex.Schema.dropTableIfExists("permissions")
    ]).then(function () {
        // Drop the relation tables after the model tables?
        return when.all([
            knex.Schema.dropTableIfExists("roles_users"),
            knex.Schema.dropTableIfExists("permissions_users"),
            knex.Schema.dropTableIfExists("permissions_roles")
        ]);
    });
};

exports.up = up;
exports.down = down;