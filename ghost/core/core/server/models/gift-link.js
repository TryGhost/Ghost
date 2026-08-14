const ghostBookshelf = require('./base');

const GiftLink = ghostBookshelf.Model.extend({
    tableName: 'gift_links',

    // The schema's `defaultTo` covers the DB engine (MySQL/raw SQL), but the
    // base model has no generic schema-default application and bookshelf inserts
    // an explicit NULL for unset columns under SQLite's `useNullAsDefault`. So
    // new rows need their defaults declared here too — the standard Ghost model
    // pattern (cf. comment.js, automation.js, email-batch.js).
    defaults: function defaults() {
        return {
            status: 'active',
            redeemed_count: 0
        };
    },

    post() {
        return this.belongsTo('Post', 'post_id', 'id');
    }
});

module.exports = {
    GiftLink: ghostBookshelf.model('GiftLink', GiftLink)
};
