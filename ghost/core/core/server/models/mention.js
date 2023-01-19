const ghostBookshelf = require('./base');

const Mention = ghostBookshelf.Model.extend({
    tableName: 'mentions',

    targetId: function targetId() {
        return this.belongsTo('Post', 'post_id');
    }
});

const Mentions = ghostBookshelf.Collection.extend({
    model: Mention
});

module.exports = {
    Mention: ghostBookshelf.model('Mention', Mention),
    Mentions: ghostBookshelf.collection('Mentions', Mentions)
};
