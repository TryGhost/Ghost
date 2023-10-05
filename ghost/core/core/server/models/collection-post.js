const ghostBookshelf = require('./base');

const CollectionPost = ghostBookshelf.Model.extend({
    tableName: 'collections_posts'
});

module.exports = {
    CollectionPost: ghostBookshelf.model('CollectionPost', CollectionPost)
};
