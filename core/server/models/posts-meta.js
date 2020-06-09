const ghostBookshelf = require('./base');
const urlUtils = require('../../shared/url-utils');

const PostsMeta = ghostBookshelf.Model.extend({
    tableName: 'posts_meta',

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
    PostsMeta: ghostBookshelf.model('PostsMeta', PostsMeta)
};
