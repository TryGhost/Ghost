const ghostBookshelf = require('./base');

const PostsMeta = ghostBookshelf.Model.extend({
    tableName: 'posts_meta'
}, {
    post() {
        return this.belongsTo('Post');
    }
});

module.exports = {
    PostsMeta: ghostBookshelf.model('PostsMeta', PostsMeta)
};
