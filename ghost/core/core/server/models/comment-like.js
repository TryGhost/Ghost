const ghostBookshelf = require('./base');

const CommentLike = ghostBookshelf.Model.extend({
    tableName: 'comment_likes',

    defaults: function defaults() {
        return {};
    },

    comment() {
        return this.belongsTo('Comment', 'comment_id');
    },

    member() {
        return this.belongsTo('Member', 'member_id');
    },

    emitChange: function emitChange(event, options) {
        const eventToTrigger = 'comment_like' + '.' + event;
        ghostBookshelf.Model.prototype.emitChange.bind(this)(this, eventToTrigger, options);
    },

    onCreated: function onCreated(model, options) {
        const result = ghostBookshelf.Model.prototype.onCreated.apply(this, arguments);

        model.emitChange('added', options);

        return result;
    }
}, {

});

module.exports = {
    CommentLike: ghostBookshelf.model('CommentLike', CommentLike)
};
