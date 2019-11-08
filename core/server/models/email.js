const uuid = require('uuid');
const ghostBookshelf = require('./base');

const Email = ghostBookshelf.Model.extend({
    tableName: 'emails',

    defaults: function defaults() {
        return {
            uuid: uuid.v4(),
            status: 'pending',
            stats: JSON.stringify({
                delivered: 0,
                failed: 0,
                opened: 0,
                clicked: 0,
                unsubscribed: 0,
                complaints: 0
            })
        };
    },

    emitChange: function emitChange(event, options) {
        const eventToTrigger = 'email' + '.' + event;
        ghostBookshelf.Model.prototype.emitChange.bind(this)(this, eventToTrigger, options);
    },

    onCreated: function onCreated(model, attrs, options) {
        ghostBookshelf.Model.prototype.onCreated.apply(this, arguments);

        model.emitChange('added', options);
    },

    onUpdated: function onUpdated(model, attrs, options) {
        ghostBookshelf.Model.prototype.onUpdated.apply(this, arguments);

        model.emitChange('edited', options);
    },

    onDestroyed: function onDestroyed(model, options) {
        ghostBookshelf.Model.prototype.onDestroyed.apply(this, arguments);

        model.emitChange('deleted', options);
    }
}, {
    post() {
        return this.belongsTo('Post');
    }
});

const Emails = ghostBookshelf.Collection.extend({
    model: Email
});

module.exports = {
    Email: ghostBookshelf.model('Email', Email),
    Emails: ghostBookshelf.collection('Emails', Emails)
};
