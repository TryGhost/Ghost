const ghostBookshelf = require('./base');

const LinkRedirect = ghostBookshelf.Model.extend({
    tableName: 'link_redirects',

    post() {
        return this.belongsTo('Post', 'post_id');
    }
}, {
});

module.exports = {
    LinkRedirect: ghostBookshelf.model('LinkRedirect', LinkRedirect)
};
