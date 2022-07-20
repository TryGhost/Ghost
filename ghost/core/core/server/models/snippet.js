const ghostBookshelf = require('./base');
const urlUtils = require('../../shared/url-utils');
const mobiledocLib = require('../lib/mobiledoc');

const Snippet = ghostBookshelf.Model.extend({
    tableName: 'snippets',

    formatOnWrite(attrs) {
        if (attrs.mobiledoc) {
            attrs.mobiledoc = urlUtils.mobiledocToTransformReady(attrs.mobiledoc, {cardTransformers: mobiledocLib.cards});
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
