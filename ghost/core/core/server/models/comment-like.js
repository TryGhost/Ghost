module.exports = function (ghostBookshelf) {
    const _ = require('lodash');

    const CommentLike = ghostBookshelf.Model.extend({
        tableName: 'comment_likes',

        defaults: function defaults() {
            return {
                score: 1
            };
        },

        comment() {
            return this.belongsTo('Comment', 'comment_id');
        },

        member() {
            return this.belongsTo('Member', 'member_id');
        },

        serialize(options) {
            return _.omit(ghostBookshelf.Model.prototype.serialize.call(this, options), 'score');
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

    return {
        CommentLike: ghostBookshelf.model('CommentLike', CommentLike)
    };
};

Object.assign(module.exports, module.exports(require('./base')));
