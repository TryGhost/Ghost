const ghostBookshelf = require('./base');
const tag = require('./tag');

const TagPublic = tag.Tag.extend({
    shouldHavePosts: {
        joinTo: 'tag_id',
        joinTable: 'posts_tags'
    }
});

const TagsPublic = ghostBookshelf.Collection.extend({
    model: TagPublic
});

module.exports = {
    TagPublic: ghostBookshelf.model('TagPublic', TagPublic),
    TagsPublic: ghostBookshelf.collection('TagsPublic', TagsPublic)
};
