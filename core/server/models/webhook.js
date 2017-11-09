var ghostBookshelf = require('./base'),
    Promise = require('bluebird'),
    Webhook,
    Webhooks;

Webhook = ghostBookshelf.Model.extend({
    tableName: 'webhooks'
}, {
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
