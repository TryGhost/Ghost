const ghostBookshelf = require('./base');
const urlUtils = require('../../shared/url-utils');

const Snippet = ghostBookshelf.Model.extend({
    tableName: 'snippets',

    format() {
        const attrs = ghostBookshelf.Model.prototype.format.apply(this, arguments);

        if (attrs.mobiledoc) {
            attrs.mobiledoc = urlUtils.mobiledocToTransformReady(attrs.mobiledoc);
        }

        return attrs;
    },

    parse() {
        const attrs = ghostBookshelf.Model.prototype.parse.apply(this, arguments);

        if (attrs.mobiledoc) {
            attrs.mobiledoc = urlUtils.transformReadyToAbsolute(attrs.mobiledoc);
        }

        return attrs;
    }
});

const Snippets = ghostBookshelf.Collection.extend({
    model: Snippet
});

module.exports = {
    Snippet: ghostBookshelf.model('Snippet', Snippet),
    Snippets: ghostBookshelf.collection('Snippets', Snippets)
};
