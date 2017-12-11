var Promise = require('bluebird'),
    ghostBookshelf = require('./base'),
    common = require('../lib/common'),
    Webhook,
    Webhooks;

Webhook = ghostBookshelf.Model.extend({
    tableName: 'webhooks',

    emitChange: function emitChange(event, options) {
        options = options || {};

        common.events.emit('webhook' + '.' + event, this, options);
    },

    onCreated: function onCreated(model, response, options) {
        model.emitChange('added', options);
    },

    onUpdated: function onUpdated(model, response, options) {
        model.emitChange('edited', options);
    },

    onDestroyed: function onDestroyed(model, response, options) {
        model.emitChange('deleted', options);
    }
}, {
    findAllByEvent: function findAllByEvent(event, options) {
        var webhooksCollection = Webhooks.forge();

        options = this.filterOptions(options, 'findAll');

        return webhooksCollection
            .query('where', 'event', '=', event)
            .fetch(options);
    },

    getByEventAndTarget: function getByEventAndTarget(event, targetUrl, options) {
        options = options || {};
        options.require = true;

        return Webhooks.forge(options).fetch(options).then(function then(webhooks) {
            var webhookWithEventAndTarget = webhooks.find(function findWebhook(webhook) {
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
