module.exports = function (ghostBookshelf) {
    const CollectionPost = ghostBookshelf.Model.extend({
        tableName: 'collections_posts'
    });

    return {
        CollectionPost: ghostBookshelf.model('CollectionPost', CollectionPost)
    };
};

Object.assign(module.exports, module.exports(require('./base')));
