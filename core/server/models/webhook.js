var ghostBookshelf = require('./base'),
    events = require('../events'),
    Promise = require('bluebird'),
    Webhook,
    Webhooks;

Webhook = ghostBookshelf.Model.extend({
    tableName: 'webhooks',

    emitChange: function emitChange(event) {
        events.emit('webhook' + '.' + event, this);
    },

    onCreated: function onCreated(model) {
        model.emitChange('added');
    },

    onUpdated: function onUpdated(model) {
        model.emitChange('edited');
    },

    onDestroyed: function onDestroyed(model) {
        model.emitChange('deleted');
    }
}, {
    findAllByEvent: function findAllByEvent(event, options) {
        var webhooksCollection = Webhooks.forge();

        options = this.filterOptions(options, 'findAll');

        return webhooksCollection
            .query({where: {event: event}})
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
    Webhooks: ghostBookshelf.collection('Webhook', Webhooks)
};
