var when    = require('when'),
    knex    = require('../../models/base').Knex,
    up,
    down;

up = function () {

    return when.all([

        knex.Schema.createTable('posts', function (t) {
            t.increments().primary();
            t.string('uuid', 36).notNull();
            t.string('title', 150).notNull();
            t.string('slug', 150).notNull().unique();
            t.text('markdown', 'medium').nullable();                    // max-length 16777215
            t.text('html', 'medium').nullable();                        // max-length 16777215
            t.text('image').nullable();                                 // max-length 2000
            t.bool('featured').notNull().defaultTo(false);
            t.bool('page').notNull().defaultTo(false);
            t.string('status', 150).notNull().defaultTo('draft');
            t.string('language', 6).notNull().defaultTo('en_US');
            t.string('meta_title', 150).nullable();
            t.string('meta_description', 200).nullable();
            t.integer('author_id').notNull();
            t.dateTime('created_at').notNull();
            t.integer('created_by').notNull();
            t.dateTime('updated_at').nullable();
            t.integer('updated_by').nullable();
            t.dateTime('published_at').nullable();
            t.integer('published_by').nullable();
        }),

        knex.Schema.createTable('users', function (t) {
            t.increments().primary();
            t.string('uuid', 36).notNull();
            t.string('name', 150).notNull();
            t.string('slug', 150).notNull().unique();
            t.string('password', 60).notNull();
            t.string('email', 254).notNull().unique();
            t.text('image').nullable();                                 // max-length 2000
            t.text('cover').nullable();                                 // max-length 2000
            t.string('bio', 200).nullable();
            t.text('website').nullable();                               // max-length 2000
            t.text('location').nullable();                              // max-length 65535
            t.text('accessibility').nullable();                         // max-length 65535
            t.string('status', 150).notNull().defaultTo('active');
            t.string('language', 6).notNull().defaultTo('en_US');
            t.string('meta_title', 150).nullable();
            t.string('meta_description', 200).nullable();
            t.dateTime('last_login').nullable();
            t.dateTime('created_at').notNull();
            t.integer('created_by').notNull();
            t.dateTime('updated_at').nullable();
            t.integer('updated_by').nullable();
        }),

        knex.Schema.createTable('roles', function (t) {
            t.increments().primary();
            t.string('uuid', 36).notNull();
            t.string('name', 150).notNull();
            t.string('description', 200).nullable();
            t.dateTime('created_at').notNull();
            t.integer('created_by').notNull();
            t.dateTime('updated_at').nullable();
            t.integer('updated_by').nullable();
        }),

        knex.Schema.createTable('roles_users', function (t) {
            t.increments().primary();
            t.integer('role_id').notNull();
            t.integer('user_id').notNull();
        }),

        knex.Schema.createTable('permissions', function (t) {
            t.increments().primary();
            t.string('uuid', 36).notNull();
            t.string('name', 150).notNull();
            t.string('object_type', 150).notNull();
            t.string('action_type', 150).notNull();
            t.integer('object_id').nullable();
            t.dateTime('created_at').notNull();
            t.integer('created_by').notNull();
            t.dateTime('updated_at').nullable();
            t.integer('updated_by').nullable();
        }),

        knex.Schema.createTable('permissions_users', function (t) {
            t.increments().primary();
            t.integer('user_id').notNull();
            t.integer('permission_id').notNull();
        }),

        knex.Schema.createTable('permissions_roles', function (t) {
            t.increments().primary();
            t.integer('role_id').notNull();
            t.integer('permission_id').notNull();
        }),

        knex.Schema.createTable('settings', function (t) {
            t.increments().primary();
            t.string('uuid', 36).notNull();
            t.string('key', 150).notNull().unique();
            t.text('value').nullable();                             // max-length 65535
            t.string('type', 150).notNull().defaultTo('core');
            t.dateTime('created_at').notNull();
            t.integer('created_by').notNull();
            t.dateTime('updated_at').nullable();
            t.integer('updated_by').nullable();
        }),
        knex.Schema.createTable('tags', function (t) {
            t.increments().primary();
            t.string('uuid', 36).notNull();
            t.string('name', 150).notNull();
            t.string('slug', 150).notNull().unique();
            t.string('description', 200).nullable();
            t.integer('parent_id').nullable();
            t.string('meta_title', 150).nullable();
            t.string('meta_description', 200).nullable();
            t.dateTime('created_at').notNull();
            t.integer('created_by').notNull();
            t.dateTime('updated_at').nullable();
            t.integer('updated_by').nullable();
        }),
        knex.Schema.createTable('posts_tags', function (t) {
            t.increments().primary();
            t.integer('post_id').notNull().unsigned().references('id').inTable('posts');
            t.integer('tag_id').notNull().unsigned().references('id').inTable('tags');
        })
    ]);
};

down = function () {
    return when.all([
        knex.Schema.dropTableIfExists('posts_tags'),
        knex.Schema.dropTableIfExists('roles_users'),
        knex.Schema.dropTableIfExists('permissions_users'),
        knex.Schema.dropTableIfExists('permissions_roles'),
        knex.Schema.dropTableIfExists('users')

    ]).then(function () {
        return when.all([
            knex.Schema.dropTableIfExists('roles'),
            knex.Schema.dropTableIfExists('settings'),
            knex.Schema.dropTableIfExists('permissions'),
            knex.Schema.dropTableIfExists('tags'),
            knex.Schema.dropTableIfExists('posts')
        ]);
    });
};

exports.up   = up;
exports.down = down;