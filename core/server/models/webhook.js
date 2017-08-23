var ghostBookshelf = require('./base'),
    Webhook,
    Webhooks;

Webhook = ghostBookshelf.Model.extend({
    tableName: 'webhooks'
});

Webhooks = ghostBookshelf.Collection.extend({
    model: Webhook
});

module.exports = {
    Webhook: ghostBookshelf.model('Webhook', Webhook),
    Webhooks: ghostBookshelf.collection('Webhooks', Webhooks)
}
