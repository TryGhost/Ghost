module.exports = function (ghostBookshelf) {
    // Tag must be registered before TagPublic can extend it
    require('./tag');

    const TagPublic = ghostBookshelf.model('Tag').extend({
        shouldHavePosts: {
            joinTo: 'tag_id',
            joinTable: 'posts_tags'
        }
    });

    const TagsPublic = ghostBookshelf.Collection.extend({
        model: TagPublic
    });

    return {
        TagPublic: ghostBookshelf.model('TagPublic', TagPublic),
        TagsPublic: ghostBookshelf.collection('TagsPublic', TagsPublic)
    };
};

Object.assign(module.exports, module.exports(require('./base')));
