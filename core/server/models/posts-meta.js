const ghostBookshelf = require('./base');

const PostsMeta = ghostBookshelf.Model.extend({
    tableName: 'posts_meta'
}, {
    emitChange: function emitChange(event, options) {
        const eventToTrigger = 'posts_meta' + '.' + event;
        ghostBookshelf.Model.prototype.emitChange.bind(this)(this, eventToTrigger, options);
    },

    post() {
        return this.belongsTo('Post');
    }
});

module.exports = {
    PostsMeta: ghostBookshelf.model('PostsMeta', PostsMeta)
};
