var when    = require('when'),
    knex    = require('../../models/base').knex,
    up,
    down,
    constraints = {
        posts: {
            id: {maxlength: 0, nullable: false},
            uuid: {maxlength: 36, nullable: false},
            title: {maxlength: 150, nullable: false},
            slug: {maxlength: 150, nullable: false},
            markdown: {maxlength: 16777215, nullable: true},
            html: {maxlength: 16777215, nullable: true},
            image: {maxlength: 2000, nullable: true},
            featured: {maxlength: 0, nullable: false},
            page: {maxlength: 0, nullable: false},
            status: {maxlength: 150, nullable: false},
            language: {maxlength: 6, nullable: false},
            meta_title: {maxlength: 150, nullable: true},
            meta_description: {maxlength: 200, nullable: true},
            author_id: {maxlength: 0, nullable: false},
            created_at: {maxlength: 0, nullable: false},
            created_by: {maxlength: 0, nullable: false},
            updated_at: {maxlength: 0, nullable: true},
            updated_by: {maxlength: 0, nullable: true},
            published_at: {maxlength: 0, nullable: true},
            published_by: {maxlength: 0, nullable: true},
        },
        users: {
            id: {maxlength: 0, nullable: false},
            uuid: {maxlength: 36, nullable: false},
            name: {maxlength: 150, nullable: false},
            slug: {maxlength: 150, nullable: false},
            password: {maxlength: 60, nullable: false},
            email: {maxlength: 254, nullable: false},
            image: {maxlength: 2000, nullable: true},
            cover: {maxlength: 2000, nullable: true},
            bio: {maxlength: 200, nullable: true},
            website: {maxlength: 2000, nullable: true},
            location: {maxlength: 65535, nullable: true},
            accessibility: {maxlength: 65535, nullable: true},
            status: {maxlength: 150, nullable: false},
            language: {maxlength: 6, nullable: false},
            meta_title: {maxlength: 150, nullable: true},
            meta_description: {maxlength: 200, nullable: true},
            last_login: {maxlength: 0, nullable: true},
            created_at: {maxlength: 0, nullable: false},
            created_by: {maxlength: 0, nullable: false},
            updated_at: {maxlength: 0, nullable: true},
            updated_by: {maxlength: 0, nullable: true},
        },
        roles: {
            id: {maxlength: 0, nullable: false},
            uuid: {maxlength: 36, nullable: false},
            name: {maxlength: 150, nullable: false},
            description: {maxlength: 200, nullable: true},
            created_at: {maxlength: 0, nullable: false},
            created_by: {maxlength: 0, nullable: false},
            updated_at: {maxlength: 0, nullable: true},
            updated_by: {maxlength: 0, nullable: true},
        },
        roles_users: {
            id: {maxlength: 0, nullable: false},
            role_id: {maxlength: 0, nullable: false},
            user_id: {maxlength: 0, nullable: false},
        },
        permissions: {
            id: {maxlength: 0, nullable: false},
            uuid: {maxlength: 36, nullable: false},
            name: {maxlength: 150, nullable: false},
            object_type: {maxlength: 150, nullable: false},
            action_type: {maxlength: 150, nullable: false},
            object_id: {maxlength: 0, nullable: true},
            created_at: {maxlength: 0, nullable: false},
            created_by: {maxlength: 0, nullable: false},
            updated_at: {maxlength: 0, nullable: true},
            updated_by: {maxlength: 0, nullable: true},
        },
        permissions_users: {
            id: {maxlength: 0, nullable: false},
            user_id: {maxlength: 0, nullable: false},
            permission_id: {maxlength: 0, nullable: false},
        },
        permissions_roles: {
            id: {maxlength: 0, nullable: false},
            role_id: {maxlength: 0, nullable: false},
            permission_id: {maxlength: 0, nullable: false},
        },
        settings: {
            id: {maxlength: 0, nullable: false},
            uuid: {maxlength: 36, nullable: false},
            key: {maxlength: 150, nullable: false},
            value: {maxlength: 65535, nullable: true},
            type: {maxlength: 150, nullable: false},
            created_at: {maxlength: 0, nullable: false},
            created_by: {maxlength: 0, nullable: false},
            updated_at: {maxlength: 0, nullable: true},
            updated_by: {maxlength: 0, nullable: true},
        },
        tags: {
            id: {maxlength: 0, nullable: false},
            uuid: {maxlength: 36, nullable: false},
            name: {maxlength: 150, nullable: false},
            slug: {maxlength: 150, nullable: false},
            description: {maxlength: 200, nullable: true},
            parent_id: {maxlength: 0, nullable: true},
            meta_title: {maxlength: 150, nullable: true},
            meta_description: {maxlength: 200, nullable: true},
            created_at: {maxlength: 0, nullable: false},
            created_by: {maxlength: 0, nullable: false},
            updated_at: {maxlength: 0, nullable: true},
            updated_by: {maxlength: 0, nullable: true},
        },
        posts_tags: {
            id: {maxlength: 0, nullable: false},
            post_id: {maxlength: 0, nullable: false},
            tag_id: {maxlength: 0, nullable: false},
        }
    };


up = function () {

    return when.all([

        knex.schema.createTable('posts', function (t) {
            t.increments().primary();
            t.string('uuid', constraints.posts.uuid.maxlength).notNull();
            t.string('title', constraints.posts.title.maxlength).notNull();
            t.string('slug', constraints.posts.slug.maxlength).notNull().unique();
            t.text('markdown', 'medium').nullable();                    // max-length 16777215
            t.text('html', 'medium').nullable();                        // max-length 16777215
            t.text('image').nullable();                                 // max-length 2000
            t.bool('featured').notNull().defaultTo(false);
            t.bool('page').notNull().defaultTo(false);
            t.string('status', constraints.posts.status.maxlength).notNull().defaultTo('draft');
            t.string('language', constraints.posts.language.maxlength).notNull().defaultTo('en_US');
            t.string('meta_title', constraints.posts.meta_title.maxlength).nullable();
            t.string('meta_description', constraints.posts.meta_description.maxlength).nullable();
            t.integer('author_id').notNull();
            t.dateTime('created_at').notNull();
            t.integer('created_by').notNull();
            t.dateTime('updated_at').nullable();
            t.integer('updated_by').nullable();
            t.dateTime('published_at').nullable();
            t.integer('published_by').nullable();
        }),

        knex.schema.createTable('users', function (t) {
            t.increments().primary();
            t.string('uuid', constraints.users.uuid.maxlength).notNull();
            t.string('name', constraints.users.name.maxlength).notNull();
            t.string('slug', constraints.users.slug.maxlength).notNull().unique();
            t.string('password', constraints.users.password.maxlength).notNull();
            t.string('email', constraints.users.email.maxlength).notNull().unique();
            t.text('image').nullable();                                 // max-length 2000
            t.text('cover').nullable();                                 // max-length 2000
            t.string('bio', constraints.users.bio.maxlength).nullable();
            t.text('website').nullable();                               // max-length 2000
            t.text('location').nullable();                              // max-length 65535
            t.text('accessibility').nullable();                         // max-length 65535
            t.string('status', constraints.users.status.maxlength).notNull().defaultTo('active');
            t.string('language', constraints.users.language.maxlength).notNull().defaultTo('en_US');
            t.string('meta_title', constraints.users.meta_title.maxlength).nullable();
            t.string('meta_description', constraints.users.meta_description.maxlength).nullable();
            t.dateTime('last_login').nullable();
            t.dateTime('created_at').notNull();
            t.integer('created_by').notNull();
            t.dateTime('updated_at').nullable();
            t.integer('updated_by').nullable();
        }),

        knex.schema.createTable('roles', function (t) {
            t.increments().primary();
            t.string('uuid', constraints.roles.uuid.maxlength).notNull();
            t.string('name', constraints.roles.name.maxlength).notNull();
            t.string('description', constraints.roles.description.maxlength).nullable();
            t.dateTime('created_at').notNull();
            t.integer('created_by').notNull();
            t.dateTime('updated_at').nullable();
            t.integer('updated_by').nullable();
        }),

        knex.schema.createTable('roles_users', function (t) {
            t.increments().primary();
            t.integer('role_id').notNull();
            t.integer('user_id').notNull();
        }),

        knex.schema.createTable('permissions', function (t) {
            t.increments().primary();
            t.string('uuid', constraints.permissions.uuid.maxlength).notNull();
            t.string('name', constraints.permissions.name.maxlength).notNull();
            t.string('object_type', constraints.permissions.object_type.maxlength).notNull();
            t.string('action_type', constraints.permissions.action_type.maxlength).notNull();
            t.integer('object_id').nullable();
            t.dateTime('created_at').notNull();
            t.integer('created_by').notNull();
            t.dateTime('updated_at').nullable();
            t.integer('updated_by').nullable();
        }),

        knex.schema.createTable('permissions_users', function (t) {
            t.increments().primary();
            t.integer('user_id').notNull();
            t.integer('permission_id').notNull();
        }),

        knex.schema.createTable('permissions_roles', function (t) {
            t.increments().primary();
            t.integer('role_id').notNull();
            t.integer('permission_id').notNull();
        }),

        knex.schema.createTable('settings', function (t) {
            t.increments().primary();
            t.string('uuid', constraints.settings.uuid.maxlength).notNull();
            t.string('key', constraints.settings.key.maxlength).notNull().unique();
            t.text('value').nullable();                             // max-length 65535
            t.string('type', constraints.settings.type.maxlength).notNull().defaultTo('core');
            t.dateTime('created_at').notNull();
            t.integer('created_by').notNull();
            t.dateTime('updated_at').nullable();
            t.integer('updated_by').nullable();
        }),
        knex.schema.createTable('tags', function (t) {
            t.increments().primary();
            t.string('uuid', constraints.tags.uuid.maxlength).notNull();
            t.string('name', constraints.tags.name.maxlength).notNull();
            t.string('slug', constraints.tags.slug.maxlength).notNull().unique();
            t.string('description', constraints.tags.description.maxlength).nullable();
            t.integer('parent_id').nullable();
            t.string('meta_title', constraints.tags.meta_title.maxlength).nullable();
            t.string('meta_description', constraints.tags.meta_description.maxlength).nullable();
            t.dateTime('created_at').notNull();
            t.integer('created_by').notNull();
            t.dateTime('updated_at').nullable();
            t.integer('updated_by').nullable();
        })
    ]).then(function () {
        return knex.schema.createTable('posts_tags', function (t) {
            t.increments().primary();
            t.integer('post_id').notNull().unsigned().references('id').inTable('posts');
            t.integer('tag_id').notNull().unsigned().references('id').inTable('tags');
        });
    });
};

down = function () {
    return when.all([
        knex.schema.dropTableIfExists('posts_tags'),
        knex.schema.dropTableIfExists('roles_users'),
        knex.schema.dropTableIfExists('permissions_users'),
        knex.schema.dropTableIfExists('permissions_roles'),
        knex.schema.dropTableIfExists('users')

    ]).then(function () {
        return when.all([
            knex.schema.dropTableIfExists('roles'),
            knex.schema.dropTableIfExists('settings'),
            knex.schema.dropTableIfExists('permissions'),
            knex.schema.dropTableIfExists('tags'),
            knex.schema.dropTableIfExists('posts')
        ]);
    });
};

exports.up   = up;
exports.down = down;
exports.constraints = constraints;
