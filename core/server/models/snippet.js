const ghostBookshelf = require('./base');

const Snippet = ghostBookshelf.Model.extend({
    tableName: 'snippets'
});

const Snippets = ghostBookshelf.Collection.extend({
    model: Snippet
});

module.exports = {
    Snippet: ghostBookshelf.model('Snippet', Snippet),
    Snippets: ghostBookshelf.collection('Snippets', Snippets)
};
