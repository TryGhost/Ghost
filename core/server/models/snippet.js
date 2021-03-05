const ghostBookshelf = require('./base');
const urlUtils = require('../../shared/url-utils');

const Snippet = ghostBookshelf.Model.extend({
    tableName: 'snippets',

    onSaving: function onSaving() {
        const urlTransformMap = {
            mobiledoc: 'mobiledocToTransformReady'
        };

        Object.entries(urlTransformMap).forEach(([attr, transform]) => {
            let method = transform;
            let methodOptions = {};

            if (typeof transform === 'object') {
                method = transform.method;
                methodOptions = transform.options || {};
            }

            if (this.hasChanged(attr) && this.get(attr)) {
                const transformedValue = urlUtils[method](this.get(attr), methodOptions);
                this.set(attr, transformedValue);
            }
        });

        ghostBookshelf.Model.prototype.onSaving.apply(this, arguments);
    }
});

const Snippets = ghostBookshelf.Collection.extend({
    model: Snippet
});

module.exports = {
    Snippet: ghostBookshelf.model('Snippet', Snippet),
    Snippets: ghostBookshelf.collection('Snippets', Snippets)
};
