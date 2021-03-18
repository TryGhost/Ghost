const ghostBookshelf = require('./base');
const urlUtils = require('../../shared/url-utils');

const PostsMeta = ghostBookshelf.Model.extend({
    tableName: 'posts_meta',

    format() {
        const attrs = ghostBookshelf.Model.prototype.format.apply(this, arguments);

        ['og_image', 'twitter_image'].forEach((attr) => {
            if (attrs[attr]) {
                attrs[attr] = urlUtils.toTransformReady(attrs[attr]);
            }
        });

        return attrs;
    },

    parse() {
        const attrs = ghostBookshelf.Model.prototype.parse.apply(this, arguments);

        ['og_image', 'twitter_image'].forEach((attr) => {
            if (attrs[attr]) {
                attrs[attr] = urlUtils.transformReadyToAbsolute(attrs[attr]);
            }
        });

        return attrs;
    }
}, {
    post() {
        return this.belongsTo('Post');
    }
});

module.exports = {
    PostsMeta: ghostBookshelf.model('PostsMeta', PostsMeta)
};
