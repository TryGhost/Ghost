module.exports = function (ghostBookshelf) {
    // User must be registered before Author can extend it
    require('./user');

    const Author = ghostBookshelf.model('User').extend({
        shouldHavePosts: {
            joinTo: 'author_id',
            joinTable: 'posts_authors'
        }
    });

    const Authors = ghostBookshelf.Collection.extend({
        model: Author
    });

    return {
        Author: ghostBookshelf.model('Author', Author),
        Authors: ghostBookshelf.collection('Authors', Authors)
    };
};

Object.assign(module.exports, module.exports(require('./base')));
