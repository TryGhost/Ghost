/**
 * Database Schema, created with JugglingDB
 *
 * Vastly incomplete!
 */

/*globals module, require */
(function () {
    "use strict";

    var Schema = require('jugglingdb').Schema,
        schema = new Schema('sqlite3', {
            database: __dirname + '/../data/datastore.db'
        }),
        Post,
        User,
        Setting;

    /*------------------------------------------------------------------------------------
     POST / Post / Posts
     ------------------------------------------------------------------------------------*/
    Post = schema.define('Post', {
        title:          String,
        slug:           String,
        content:        Schema.Text,
        contentHtml:    Schema.Text,
        featured:       Boolean,
        image:          String,
        status:         String,
        language:       String,
        createdAt:      Date,
        createdBy:      Number,
        updatedAt:      Date,
        updatedBy:      Number
    });

    Post.prototype.generateSlug = function () {
        return this.title.replace(/\:/g, '').replace(/\s/g, '-').toLowerCase();
    };

    Post.prototype.preCreate = function (next) {
        console.log('pre create 1', this);

        if (this.createdAt === undefined) {
            this.createdAt = new Date();
        }
        if (this.slug === undefined) {
            this.slug = this.generateSlug();
        }

        console.log('pre create 2', this);
        next();
    };

    // Validations
    Post.validatesPresenceOf('title', {message: 'Post title cannot be blank'});
    //Post.validatesPresenceOf('slug');
    //Post.validatesPresenceOf('language', {message: 'Language cannot be blank'});
    //Post.validatesUniquenessOf('slug');
    //Post.validatesLengthOf('language', {min: 2, max: 5}, "The language code should be between 2 and 5 chars long, E.g. 'en' or 'en_GB' ");


    Post.beforeSave = function (next, data) {
        console.log('before s1', data);
        // set updated
        data.updatedAt = new Date();
        next();
    };

    /*------------------------------------------------------------------------------------
     USER / User / Users
     ------------------------------------------------------------------------------------*/
    User = schema.define('User', {
        username: String,
        firstName: String,
        lastName: String,
        emailAddress: String,
        profilePicture: String,
        coverPicture: String,
        bio: Schema.Text,
        url: String,
        createdAt:      Date,
        createdBy:      Number,
        updatedAt:      Date,
        updatedBy:      Number
    });


    /*------------------------------------------------------------------------------------
     SETTING / Setting / Settings
     ------------------------------------------------------------------------------------*/
    Setting = schema.define('Setting', {
        key: String,
        value: Schema.Text,
        createdAt:      Date,
        createdBy:      Number,
        updatedAt:      Date,
        updatedBy:      Number
    });


    /*------------------------------------------------------------------------------------
     RELATIONSHIPS
     ------------------------------------------------------------------------------------*/
    User.hasMany(Post,   {as: 'posts',  foreignKey: 'createdBy'});
    Post.belongsTo(User, {as: 'author', foreignKey: 'createdBy'});

    schema.autoupdate();

    exports.schema = schema;
}());