const Promise = require('bluebird'),
    ghostBookshelf = require('./base'),
    common = require('../lib/common');

let Subscriber,
    Subscribers;

Subscriber = ghostBookshelf.Model.extend({
    tableName: 'subscribers',

    emitChange: function emitChange(event, options) {
        const eventToTrigger = 'subscriber' + '.' + event;
        ghostBookshelf.Model.prototype.emitChange.bind(this)(this, eventToTrigger, options);
    },

    defaults: function defaults() {
        return {
            status: 'subscribed'
        };
    },

    onCreated: function onCreated(model, response, options) {
        ghostBookshelf.Model.prototype.onCreated.apply(this, arguments);

        model.emitChange('added', options);
    },

    onUpdated: function onUpdated(model, response, options) {
        ghostBookshelf.Model.prototype.onUpdated.apply(this, arguments);

        model.emitChange('edited', options);
    },

    onDestroyed: function onDestroyed(model, options) {
        ghostBookshelf.Model.prototype.onDestroyed.apply(this, arguments);

        model.emitChange('deleted', options);
    }
}, {

    orderDefaultOptions: function orderDefaultOptions() {
        return {};
    },

    permittedOptions: function permittedOptions(methodName) {
        var options = ghostBookshelf.Model.permittedOptions.call(this, methodName),

            // whitelists for the `options` hash argument on methods, by method name.
            // these are the only options that can be passed to Bookshelf / Knex.
            validOptions = {
                findAll: ['columns']
            };

        if (validOptions[methodName]) {
            options = options.concat(validOptions[methodName]);
        }

        return options;
    },

    permissible: function permissible(postModelOrId, action, context, unsafeAttrs, loadedPermissions, hasUserPermission, hasAppPermission, hasApiKeyPermission) {
        // CASE: external is only allowed to add and edit subscribers
        if (context.external) {
            if (['add', 'edit'].indexOf(action) !== -1) {
                return Promise.resolve();
            }
        }

        if (hasUserPermission && hasAppPermission && hasApiKeyPermission) {
            return Promise.resolve();
        }

        return Promise.reject(new common.errors.NoPermissionError({message: common.i18n.t('errors.models.subscriber.notEnoughPermission')}));
    },

    // TODO: This is a copy paste of models/user.js!
    getByEmail: function getByEmail(email, unfilteredOptions) {
        var options = ghostBookshelf.Model.filterOptions(unfilteredOptions, 'getByEmail');
        options.require = true;

        return Subscribers.forge().fetch(options).then(function then(subscribers) {
            var subscriberWithEmail = subscribers.find(function findSubscriber(subscriber) {
                return subscriber.get('email').toLowerCase() === email.toLowerCase();
            });

            if (subscriberWithEmail) {
                return subscriberWithEmail;
            }
        }).catch(function (error) {
            if (error.message === 'NotFound' || error.message === 'EmptyResponse') {
                return Promise.resolve();
            }

            return Promise.reject(error);
        });
    }
});

Subscribers = ghostBookshelf.Collection.extend({
    model: Subscriber
});

module.exports = {
    Subscriber: ghostBookshelf.model('Subscriber', Subscriber),
    Subscribers: ghostBookshelf.collection('Subscriber', Subscribers)
};
