var ghostBookshelf = require('./base'),
    PushSubscriber,
    PushSubscribers;

PushSubscriber = ghostBookshelf.Model.extend({
    tableName: 'push_subscribers',

    defaults: function defaults () {
        return {
            subscribed_at: new Date()
        };
    },

    creating: function creating (newObj, attr, options) {
        /*jshint unused:false*/
    },

    saving: function saving (newObj, attr, options) {
        /*jshint unused:false*/
        this.attributes = this.pick(this.permittedAttributes());
        this._updatedAttributes = newObj.previousAttributes();
    }
}, {
    findAllByTopicUrls: function findAllByTopicUrls (topicUrls) {
        return this.query('whereIn', 'topic_url', topicUrls)
            .fetchAll()
    }
});

PushSubscribers = ghostBookshelf.Collection.extend({
    model: PushSubscriber
});

module.exports = {
    PushSubscriber: ghostBookshelf.model('PushSubscriber', PushSubscriber),
    PushSubscribers: ghostBookshelf.collection('PushSubscribers', PushSubscribers)
};
