const ghostBookshelf = require('./base');

const GiftLink = ghostBookshelf.Model.extend({
    tableName: 'gift_links',

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
