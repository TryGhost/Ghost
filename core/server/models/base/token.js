var Promise         = require('bluebird'),
    ghostBookshelf  = require('./index'),
    errors          = require('../../errors'),

    Basetoken;

Basetoken = ghostBookshelf.Model.extend({

    user: function user() {
        return this.belongsTo('User');
    },

    client: function client() {
        return this.belongsTo('Client');
    },

    // override for base function since we don't have
    // a created_by field for sessions
    creating: function creating(newObj, attr, options) {
        /*jshint unused:false*/
    },

    // override for base function since we don't have
    // a updated_by field for sessions
    saving: function saving(newObj, attr, options) {
        /*jshint unused:false*/
        // Remove any properties which don't belong on the model
        this.attributes = this.pick(this.permittedAttributes());
    }

}, {
    destroyAllExpired:  function destroyAllExpired(options) {
        options = this.filterOptions(options, 'destroyAll');
        return ghostBookshelf.Collection.forge([], {model: this})
            .query('where', 'expires', '<', Date.now())
            .fetch(options)
            .then(function then(collection) {
                collection.invokeThen('destroy', options);
            });
    },
    /**
     * ### destroyByUser
     * @param  {[type]} options has context and id. Context is the user doing the destroy, id is the user to destroy
     */
    destroyByUser: function destroyByUser(options) {
        var userId = options.id;

        options = this.filterOptions(options, 'destroyByUser');

        if (userId) {
            return ghostBookshelf.Collection.forge([], {model: this})
                .query('where', 'user_id', '=', userId)
                .fetch(options)
                .then(function then(collection) {
                    collection.invokeThen('destroy', options);
                });
        }

        return Promise.reject(new errors.NotFoundError('No user found'));
    },

    /**
     * ### destroyByToken
     * @param  {[type]} options has token where token is the token to destroy
     */
    destroyByToken: function destroyByToken(options) {
        var token = options.token;

        options = this.filterOptions(options, 'destroyByUser');

        if (token) {
            return ghostBookshelf.Collection.forge([], {model: this})
                .query('where', 'token', '=', token)
                .fetch(options)
                .then(function then(collection) {
                    collection.invokeThen('destroy', options);
                });
        }

        return Promise.reject(new errors.NotFoundError('Token not found'));
    }
});

module.exports = Basetoken;
