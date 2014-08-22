var _              = require('lodash'),
    when           = require('when'),
    errors         = require('../errors'),
    ghostBookshelf = require('./base'),
    http           = require('http'),
    crypto         = require('crypto'),
    validator      = require('validator'),
    validation     = require('../data/validation'),
    Role           = require('./role').Role,
    PostType;


PostType = ghostBookshelf.Model.extend({

    tableName: 'post_type',

    // For the user model ONLY it is possible to disable validations.
    // This is used to bypass validation during the credential check, and must never be done with user-provided data
    // Should be removed when #3691 is done
    validate: function () {
        var opts = arguments[1];
        if (opts && _.has(opts, 'validate') && opts.validate === false) {
            return;
        }
        return validation.validateSchema(this.tableName, this.toJSON());
    },

    // Get the user from the options object
    contextPost: function (options) {
        // Default to context user
        if (options.context && options.context.posts) {
            return options.context.posts;
            // Other wise use the internal override
        } else if (options.context && options.context.internal) {
            return 1;
            // This is the user object, so try using this user's id
        } else if (this.get('id')) {
            return this.get('id');
        } else {
            errors.logAndThrowError(new Error('missing context'));
        }
    },

    toJSON: function (options) {
        var attrs = ghostBookshelf.Model.prototype.toJSON.call(this, options);
        // remove password hash for security reasons
        delete attrs.password;

        return attrs;
    },

    posts: function () {
        return this.hasMany('Posts', 'post_type');
    }
}, {
    /**
    * Returns an array of keys permitted in a method's `options` hash, depending on the current method.
    * @param {String} methodName The name of the method to check valid options for.
    * @return {Array} Keys allowed in the `options` hash of the model's method.
    */
    permittedOptions: function (methodName) {
        var options = ghostBookshelf.Model.permittedOptions(),

            // whitelists for the `options` hash argument on methods, by method name.
            // these are the only options that can be passed to Bookshelf / Knex.
            validOptions = {
                findOne: ['withRelated', 'status'],
                findAll: ['withRelated'],
                setup: ['id'],
                edit: ['withRelated', 'id']
            };

        if (validOptions[methodName]) {
            options = options.concat(validOptions[methodName]);
        }

        return options;
    },

    /**
     * ### Find All
     *
     * @param options
     * @returns {*}
     */
    findPage: function(options){
        options = options || {};
        return ghostBookshelf.Model.findAll.call(this, options);
    },
    findAll:  function (options) {
        options = options || {};
        //options.withRelated = _.union([ 'posts' ], options.include);
        return ghostBookshelf.Model.findAll.call(this, options);
    }

});



PostTypes = ghostBookshelf.Collection.extend({
    model: PostType
});

module.exports = {
    PostType: ghostBookshelf.model('PostType', PostType),
    PostTypes: ghostBookshelf.collection('PostTypes', PostTypes)
};