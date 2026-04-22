const ghostBookshelf = require('./base');

const CommentDislike = ghostBookshelf.Model.extend({
    tableName: 'comment_dislikes',

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
        const eventToTrigger = 'comment_dislike' + '.' + event;
        ghostBookshelf.Model.prototype.emitChange.bind(this)(this, eventToTrigger, options);
    },

    onCreated: function onCreated(model, options) {
        ghostBookshelf.Model.prototype.onCreated.apply(this, arguments);

        model.emitChange('added', options);
    }
}, {

});

module.exports = {
    CommentDislike: ghostBookshelf.model('CommentDislike', CommentDislike)
};
