const ghostBookshelf = require('./base');

const CommentReport = ghostBookshelf.Model.extend({
    tableName: 'comment_reports',

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
        const eventToTrigger = 'comment_report' + '.' + event;
        ghostBookshelf.Model.prototype.emitChange.bind(this)(this, eventToTrigger, options);
    },

    onCreated: function onCreated(model, options) {
        model.emitChange('added', options);

        return ghostBookshelf.Model.prototype.onCreated.apply(this, arguments);
    }
}, {

});

module.exports = {
    CommentReport: ghostBookshelf.model('CommentReport', CommentReport)
};
