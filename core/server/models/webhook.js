const Promise = require('bluebird'),
    ghostBookshelf = require('./base');

let Webhook,
    Webhooks;

Webhook = ghostBookshelf.Model.extend({
    tableName: 'webhooks',

    emitChange: function emitChange(event, options) {
        const eventToTrigger = 'webhook' + '.' + event;
        ghostBookshelf.Model.prototype.emitChange.bind(this)(this, eventToTrigger, options);
    },

    onCreated: function onCreated(model, response, options) {
        model.emitChange('added', options);
    },

    onUpdated: function onUpdated(model, response, options) {
        model.emitChange('edited', options);
    },

    onDestroyed: function onDestroyed(model, options) {
        model.emitChange('deleted', options);
    }
}, {
    findAllByEvent: function findAllByEvent(event, unfilteredOptions) {
        var options = this.filterOptions(unfilteredOptions, 'findAll'),
            webhooksCollection = Webhooks.forge();

        return webhooksCollection
            .query('where', 'event', '=', event)
            .fetch(options);
    },

    getByEventAndTarget: function getByEventAndTarget(event, targetUrl, unfilteredOptions) {
        var options = ghostBookshelf.Model.filterOptions(unfilteredOptions, 'getByEventAndTarget');
        options.require = true;

        return Webhooks.forge().fetch(options).then(function then(webhooks) {
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
