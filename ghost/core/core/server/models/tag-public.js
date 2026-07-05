const ghostBookshelf = require('./base');
const tag = require('./tag');

const TagPublic = tag.Tag.extend({
    shouldHavePosts: {
        joinTo: 'tag_id',
        joinTable: 'posts_tags'
    },
    enforcedFilters: function enforcedFilters(options) {
        return options.context && options.context.public ? 'visibility:public' : null;
    }
}, {
    permittedOptions: function permittedOptions(methodName) {
        const options = tag.Tag.permittedOptions.call(this, methodName);

        if (methodName === 'findOne') {
            options.push('filter');
        }

        return options;
    }
});

const TagsPublic = ghostBookshelf.Collection.extend({
    model: TagPublic
});

module.exports = {
    TagPublic: ghostBookshelf.model('TagPublic', TagPublic),
    TagsPublic: ghostBookshelf.collection('TagsPublic', TagsPublic)
};
