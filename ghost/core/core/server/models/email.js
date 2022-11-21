const uuid = require('uuid');
const ghostBookshelf = require('./base');

const Email = ghostBookshelf.Model.extend({
    tableName: 'emails',

    defaults: function defaults() {
        return {
            uuid: uuid.v4(),
            status: 'pending',
            recipient_filter: 'status:-free',
            track_opens: false,
            track_clicks: false,
            feedback_enabled: false,
            delivered_count: 0,
            opened_count: 0,
            failed_count: 0,
            source_type: 'html'
        };
    },

    parse() {
        const attrs = ghostBookshelf.Model.prototype.parse.apply(this, arguments);

        // update legacy recipient_filter values to proper NQL
        if (attrs.recipient_filter === 'free') {
            attrs.recipient_filter = 'status:free';
        }
        if (attrs.recipient_filter === 'paid') {
            attrs.recipient_filter = 'status:-free';
        }

        return attrs;
    },

    formatOnWrite(attrs) {
        // update legacy recipient_filter values to proper NQL
        if (attrs.recipient_filter === 'free') {
            attrs.recipient_filter = 'status:free';
        }
        if (attrs.recipient_filter === 'paid') {
            attrs.recipient_filter = 'status:-free';
        }

        return attrs;
    },

    post() {
        return this.belongsTo('Post', 'post_id');
    },

    emailBatches() {
        return this.hasMany('EmailBatch', 'email_id');
    },

    recipients() {
        return this.hasMany('EmailRecipient', 'email_id');
    },

    newsletter() {
        return this.belongsTo('Newsletter', 'newsletter_id');
    },

    emitChange: function emitChange(event, options) {
        const eventToTrigger = 'email' + '.' + event;
        ghostBookshelf.Model.prototype.emitChange.bind(this)(this, eventToTrigger, options);
    },

    onCreated: function onCreated(model, options) {
        ghostBookshelf.Model.prototype.onCreated.apply(this, arguments);

        model.emitChange('added', options);
    },

    onUpdated: function onUpdated(model, options) {
        ghostBookshelf.Model.prototype.onUpdated.apply(this, arguments);

        model.emitChange('edited', options);
    },

    onDestroyed: function onDestroyed(model, options) {
        ghostBookshelf.Model.prototype.onDestroyed.apply(this, arguments);

        model.emitChange('deleted', options);
    }
}, {});

const Emails = ghostBookshelf.Collection.extend({
    model: Email
});

module.exports = {
    Email: ghostBookshelf.model('Email', Email),
    Emails: ghostBookshelf.collection('Emails', Emails)
};
