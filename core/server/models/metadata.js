const ghostBookshelf = require('./base');
const urlUtils = require('../../shared/url-utils');

const Metadata = ghostBookshelf.Model.extend({
    tableName: 'metadata',

    onSaving: function onSaving() {
        const urlTransformMap = {
            og_image: 'absoluteToRelative',
            twitter_image: 'absoluteToRelative'
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
}, {
    post() {
        return this.belongsTo('Post');
    }
});

module.exports = {
    Metadata: ghostBookshelf.model('Metadata', Metadata)
};
