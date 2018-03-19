var Promise = require('bluebird'),
    ghostBookshelf = require('./index'),
    common = require('../../lib/common'),
    Basetoken;

Basetoken = ghostBookshelf.Model.extend({

    user: function user() {
        return this.belongsTo('User');
    },

    client: function client() {
        return this.belongsTo('Client');
    }
}, {
    destroyAllExpired: function destroyAllExpired(unfilteredOptions) {
        var options = this.filterOptions(unfilteredOptions, 'destroyAll');

        return ghostBookshelf.Collection.forge([], {model: this})
            .query('where', 'expires', '<', Date.now())
            .fetch(options)
            .then(function then(collection) {
                return collection.invokeThen('destroy', options);
            });
    },

    /**
     * ### destroyByUser
     * @param  {[type]} unfilteredOptions has context and id. Context is the user doing the destroy, id is the user to destroy
     */
    destroyByUser: function destroyByUser(unfilteredOptions) {
        var options = this.filterOptions(unfilteredOptions, 'destroyByUser', {extraAllowedProperties: ['id']}),
            userId = options.id;

        if (userId) {
            return ghostBookshelf.Collection.forge([], {model: this})
                .query('where', 'user_id', '=', userId)
                .fetch(options)
                .then(function then(collection) {
                    return collection.invokeThen('destroy', options);
                });
        }

        return Promise.reject(new common.errors.NotFoundError({message: common.i18n.t('errors.models.base.token.noUserFound')}));
    },

    /**
     * ### destroyByToken
     * @param  {[type]} unfilteredOptions has token where token is the token to destroy
     */
    destroyByToken: function destroyByToken(unfilteredOptions) {
        var options = this.filterOptions(unfilteredOptions, 'destroyByToken', {extraAllowedProperties: ['token']}),
            token = options.token;

        options.require = true;

        return this.forge()
            .query('where', 'token', '=', token)
            .fetch(options)
            .then(function then(model) {
                return model.destroy(options);
            });
    }
});

module.exports = Basetoken;
