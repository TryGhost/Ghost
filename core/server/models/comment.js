const ghostBookshelf = require('./base');
const _ = require('lodash');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const messages = {
    commentNotFound: 'Comment could not be found',
    notYourComment: 'You may only edit your own comments'
};

const Comment = ghostBookshelf.Model.extend({
    tableName: 'comments',

    defaults: function defaults() {
        return {
            status: 'published'
        };
    },

    post() {
        return this.belongsTo('Post', 'post_id');
    },

    member() {
        return this.belongsTo('Member', 'member_id');
    },

    parent() {
        return this.belongsTo('Comment', 'parent_id');
    },

    emitChange: function emitChange(event, options) {
        const eventToTrigger = 'comment' + '.' + event;
        ghostBookshelf.Model.prototype.emitChange.bind(this)(this, eventToTrigger, options);
    },

    onCreated: function onCreated(model, options) {
        ghostBookshelf.Model.prototype.onCreated.apply(this, arguments);

        model.emitChange('added', options);
    }
}, {
    async permissible(commentModelOrId, action, context, unsafeAttrs, loadedPermissions, hasUserPermission, hasApiKeyPermission, hasMemberPermission) {
        const self = this;

        if (_.isString(commentModelOrId)) {
            // Grab the original args without the first one
            const origArgs = _.toArray(arguments).slice(1);

            // Get the actual comment model
            return this.findOne({
                id: commentModelOrId
            }).then(function then(foundCommentModel) {
                if (!foundCommentModel) {
                    throw new errors.NotFoundError({
                        message: tpl(messages.commentNotFound)
                    });
                }

                // Build up the original args but substitute with actual model
                const newArgs = [foundCommentModel].concat(origArgs);

                return self.permissible.apply(self, newArgs);
            });
        }

        if ((action === 'edit' || action === 'destroy') && commentModelOrId.get('member_id') !== context.member.id) {
            return Promise.reject(new errors.NoPermissionError({
                message: tpl(messages.notYourComment)
            }));
        }

        return hasMemberPermission;
    }
});

module.exports = {
    Comment: ghostBookshelf.model('Comment', Comment)
};
