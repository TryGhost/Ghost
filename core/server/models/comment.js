const ghostBookshelf = require('./base');
const _ = require('lodash');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const commentsService = require('../services/comments');

const messages = {
    commentNotFound: 'Comment could not be found',
    notYourCommentToEdit: 'You may only edit your own comments',
    notYourCommentToDestroy: 'You may only delete your own comments'
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

    likes() {
        return this.hasMany('CommentLike', 'comment_id');
    },

    replies() {
        return this.hasMany('Comment', 'parent_id');
    },

    emitChange: function emitChange(event, options) {
        const eventToTrigger = 'comment' + '.' + event;
        ghostBookshelf.Model.prototype.emitChange.bind(this)(this, eventToTrigger, options);
    },

    onSaving() {
        ghostBookshelf.Model.prototype.onSaving.apply(this, arguments);

        if (this.hasChanged('html')) {
            const sanitizeHtml = require('sanitize-html');

            this.set('html', sanitizeHtml(this.get('html'), {
                allowedTags: ['p', 'br', 'a', 'blockquote'],
                allowedAttributes: {
                    a: ['href', 'target', 'rel']
                },
                selfClosing: ['br'],
                // Enforce _blank and safe URLs
                transformTags: {
                    a: sanitizeHtml.simpleTransform('a', {
                        target: '_blank', 
                        rel: 'ugc noopener noreferrer nofollow'
                    })
                }
            }));
        }
    },

    onCreated: function onCreated(model, options) {
        ghostBookshelf.Model.prototype.onCreated.apply(this, arguments);

        if (!options.context.internal) {
            commentsService.api.sendNewCommentNotifications(model);
        }

        model.emitChange('added', options);
    },

    enforcedFilters: function enforcedFilters() {
        return 'parent_id:null';
    }

}, {
    destroy: function destroy(unfilteredOptions) {
        let options = this.filterOptions(unfilteredOptions, 'destroy', {extraAllowedProperties: ['id']});

        const softDelete = () => {
            return ghostBookshelf.Model.edit.call(this, {status: 'deleted'}, options);
        };

        if (!options.transacting) {
            return ghostBookshelf.transaction((transacting) => {
                options.transacting = transacting;
                return softDelete();
            });
        }

        return softDelete();
    },

    async permissible(commentModelOrId, action, context, unsafeAttrs, loadedPermissions, hasUserPermission, hasApiKeyPermission, hasMemberPermission) {
        const self = this;

        if (hasUserPermission) {
            return true;
        }

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

        if (action === 'edit' && commentModelOrId.get('member_id') !== context.member.id) {
            return Promise.reject(new errors.NoPermissionError({
                message: tpl(messages.notYourCommentToEdit)
            }));
        }

        if (action === 'destroy' && commentModelOrId.get('member_id') !== context.member.id) {
            return Promise.reject(new errors.NoPermissionError({
                message: tpl(messages.notYourCommentToDestroy)
            }));
        }

        return hasMemberPermission;
    },

    /**
     * We have to ensure consistency. If you listen on model events (e.g. `member.added`), you can expect that you always
     * receive all fields including relations. Otherwise you can't rely on a consistent flow. And we want to avoid
     * that event listeners have to re-fetch a resource. This function is used in the context of inserting
     * and updating resources. We won't return the relations by default for now.
     */
    defaultRelations: function defaultRelations(methodName, options) {
        // @todo: the default relations are not working for 'add' when we add it below
        if (['findAll', 'findPage', 'edit', 'findOne'].indexOf(methodName) !== -1) {
            options.withRelated = _.union(['member', 'likes', 'replies', 'replies.member', 'replies.likes'], options.withRelated || []);
        }

        return options;
    }
});

module.exports = {
    Comment: ghostBookshelf.model('Comment', Comment)
};
