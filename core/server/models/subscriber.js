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
    },

    permittedOptions: function permittedOptions(methodName) {
        var options = ghostBookshelf.Model.permittedOptions(),

            // whitelists for the `options` hash argument on methods, by method name.
            // these are the only options that can be passed to Bookshelf / Knex.
            validOptions = {
                findPage: ['page', 'limit', 'columns', 'filter', 'order'],
                findAll: ['columns']
            };

        if (validOptions[methodName]) {
            options = options.concat(validOptions[methodName]);
        }

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
