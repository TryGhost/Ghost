const ghostBookshelf = require('./base');
const urlUtils = require('../../shared/url-utils');

const LinkRedirect = ghostBookshelf.Model.extend({
    tableName: 'link_redirects',

    post() {
        return this.belongsTo('Post', 'post_id');
    },

    formatOnWrite(attrs) {
        if (attrs.to) {
            attrs.to = urlUtils.absoluteToTransformReady(attrs.to);
        }

        return attrs;
    },

    parse() {
        const attrs = ghostBookshelf.Model.prototype.parse.apply(this, arguments);

        if (attrs.to) {
            attrs.to = urlUtils.transformReadyToAbsolute(attrs.to);
        }

        return attrs;
    }
}, {
});

module.exports = {
    LinkRedirect: ghostBookshelf.model('LinkRedirect', LinkRedirect)
};
