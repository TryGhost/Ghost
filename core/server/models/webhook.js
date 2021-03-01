const Promise = require('bluebird');
const ghostBookshelf = require('./base');
let Webhook;
let Webhooks;

Webhook = ghostBookshelf.Model.extend({
    tableName: 'webhooks',

    defaults() {
        return {
            api_version: 'v4',
            status: 'available'
        };
    },

    integration() {
        return this.belongsTo('Integration');
    },

    emitChange: function emitChange(event, options) {
        const eventToTrigger = 'webhook' + '.' + event;
        ghostBookshelf.Model.prototype.emitChange.bind(this)(this, eventToTrigger, options);
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
    findAllByEvent: function findAllByEvent(event, unfilteredOptions) {
        const options = this.filterOptions(unfilteredOptions, 'findAll');
        const webhooksCollection = Webhooks.forge();

        return webhooksCollection
            .query('where', 'event', '=', event)
            .fetch(options);
    },

    getByEventAndTarget: function getByEventAndTarget(event, targetUrl, unfilteredOptions) {
        const options = ghostBookshelf.Model.filterOptions(unfilteredOptions, 'getByEventAndTarget');
        options.require = true;

        return Webhooks.forge().fetch(options).then(function then(webhooks) {
            const webhookWithEventAndTarget = webhooks.find(function findWebhook(webhook) {
                return webhook.get('event').toLowerCase() === event.toLowerCase()
                    && webhook.get('target_url').toLowerCase() === targetUrl.toLowerCase();
            });

            if (webhookWithEventAndTarget) {
                return webhookWithEventAndTarget;
            }
        }).catch(function (error) {
            if (error.message === 'NotFound' || error.message === 'EmptyResponse') {
                return Promise.resolve();
            }

            return Promise.reject(error);
        });
    }
});

Webhooks = ghostBookshelf.Collection.extend({
    model: Webhook
});

module.exports = {
    Webhook: ghostBookshelf.model('Webhook', Webhook),
    Webhooks: ghostBookshelf.collection('Webhooks', Webhooks)
};
