/*global require, module */

(function () {
    "use strict";

    // We should just be able to require bookshelf and have it reference
    // the `Knex` instance bootstraped at the app initialization.
    var Bookshelf = require('bookshelf'),
        Showdown = require('showdown'),
        converter = new Showdown.converter(),

        Post,
        Posts,
        User,
        Users,
        Setting,
        Settings;

    Post = Bookshelf.Model.extend({

        tableName: 'posts',

        hasTimestamps: true,

        defaults: {
            status: 'draft'
        },

        initialize: function () {
            this.on('creating', this.creating, this);
            this.on('saving', this.saving, this);
        },

        saving: function () {
            if (!this.get('title')) {
                throw new Error('Post title cannot be blank');
            }
            this.set('content_html', converter.makeHtml(this.get('content')));

            // refactoring of ghost required in order to make these details available here
            // this.set('language', this.get('language') || ghost.config().defaultLang);
            // this.set('status', this.get('status') || ghost.statuses().draft);

        },

        creating: function () {
            if (!this.get('slug')) {
                this.generateSlug();
            }
        },

        generateSlug: function () {
            return this.set('slug', this.get('title').replace(/\:/g, '').replace(/\s/g, '-').toLowerCase());
        },

        user: function () {
            return this.belongsTo(User, 'created_by');
        }

    });

    Posts = Bookshelf.Collection.extend({

        model: Post

    });

    User = Bookshelf.Model.extend({
        tableName: 'users',
        hasTimestamps: true,
        posts: function () {
            return this.hasMany(Posts, 'created_by');
        }
    });

    Users = Bookshelf.Collection.extend({

        model: User

    });

    Setting = Bookshelf.Model.extend({
        tableName: 'settings',
        hasTimestamps: true
    });

    Settings = Bookshelf.Collection.extend({
        model: Setting
    });

    module.exports = {
        Post: Post,
        Posts: Posts,
        User: User,
        Users: Users,
        Setting: Setting,
        Settings: Settings
    };
}());