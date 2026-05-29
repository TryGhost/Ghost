const ghostBookshelf = require('./base');

const GiftLink = ghostBookshelf.Model.extend({
    tableName: 'gift_links',

    post() {
        return this.belongsTo('Post', 'post_id', 'id');
    }
});

module.exports = {
    GiftLink: ghostBookshelf.model('GiftLink', GiftLink)
};
