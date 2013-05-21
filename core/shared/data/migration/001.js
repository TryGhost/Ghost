/*global require, exports */

(function () {
    "use strict";


    var when    = require('when'),
        knex    = require('../../models/knex_init'),
        fixtures = require('../fixtures/001'),
        up,
        down;

    up = function () {

        return when.all([

            knex.Schema.createTable('posts', function (t) {
                t.increments().primary();
                t.string('title');
                t.string('slug');
                t.text('content');
                t.text('content_html');
                t.bool('featured');
                t.string('image');
                t.string('status');
                t.string('language');
                t.date('created_at');
                t.integer('created_by');
                t.date('updated_at');
                t.integer('updated_by');
            }),

            knex.Schema.createTable('users', function (t) {
                t.increments().primary();
                t.string('username');
                t.string('first_name');
                t.string('last_name');
                t.string('password');
                t.string('email_address');
                t.string('profile_picture');
                t.string('cover_picture');
                t.text('bio');
                t.string('url');
                t.date('created_at');
                t.integer('created_by');
                t.date('updated_at');
                t.integer('updated_by');
            }),

            knex.Schema.createTable('settings', function (t) {
                t.increments().primary();
                t.string('key');
                t.text('value');
                t.date('created_at');
                t.integer('created_by');
                t.date('updated_at');
                t.integer('updated_by');
            })

        // Once we create all of the initial tables, bootstrap any of the data
        ]).then(function () {

            return when.all([
                knex('posts').insert(fixtures.posts),
                knex('users').insert(fixtures.users),
                knex('settings').insert(fixtures.settings)
            ]);

        });
    };

    down = function () {};

    exports.up = up;
    exports.down = down;
}());