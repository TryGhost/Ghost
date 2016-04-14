var ghostBookshelf  = require('./base'),

    Subscriber,
    Subscribers;

Subscriber = ghostBookshelf.Model.extend({
    tableName: 'subscribers'
}, {

    orderDefaultOptions: function orderDefaultOptions() {
        return {};
    },
    /**
     * @deprecated in favour of filter
     */
    processOptions: function processOptions(options) {
        return options;
    }

});

Subscribers = ghostBookshelf.Collection.extend({
    model: Subscriber
});

module.exports = {
    Subscriber: ghostBookshelf.model('Subscriber', Subscriber),
    Subscribers: ghostBookshelf.collection('Subscriber', Subscribers)
};
