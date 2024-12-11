const ghostBookshelf = require('./base');
const _ = require('lodash');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const {ValidationError} = require('@tryghost/errors');

const messages = {
    emptyComment: 'The body of a comment cannot be empty',
    commentNotFound: 'Comment could not be found',
    notYourCommentToEdit: 'You may only edit your own comments',
    notYourCommentToDestroy: 'You may only delete your own comments'
};

/**
 * Remove empty paragraps from the start and end
 * + remove duplicate empty paragrapsh (only one empty line allowed)
 */
function trimParagraphs(str) {
    const paragraph = '<p></p>';
    const escapedParagraph = '<p>\\s*?</p>';

    const startReg = new RegExp('^(' + escapedParagraph + ')+');
    const endReg = new RegExp('(' + escapedParagraph + ')+$');
    const duplicates = new RegExp('(' + escapedParagraph + ')+');
    return str.replace(startReg, '').replace(endReg, '').replace(duplicates, paragraph);
}

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

    inReplyTo() {
        return this.belongsTo('Comment', 'in_reply_to_id');
    },

    likes() {
        return this.hasMany('CommentLike', 'comment_id');
    },

    replies() {
        return this.hasMany('Comment', 'parent_id', 'id')
            .query('orderBy', 'created_at', 'ASC')
            // Note: this limit is not working
            .query('limit', 3);
    },

    // Called by our filtered-collection bookshelf plugin
    applyCustomQuery(options) {
        const excludedCommentStatuses = options.isAdmin ? ['deleted'] : ['hidden', 'deleted'];

        this.query((qb) => {
            qb.where(function () {
                this.whereNotIn('comments.status', excludedCommentStatuses)
                    .orWhereExists(function () {
                        this.select(1)
                            .from('comments as replies')
                            .whereRaw('replies.parent_id = comments.id')
                            .whereNotIn('replies.status', excludedCommentStatuses);
                    });
            });
        });
    },

    emitChange: function emitChange(event, options) {
        const eventToTrigger = 'comment' + '.' + event;
        ghostBookshelf.Model.prototype.emitChange.bind(this)(this, eventToTrigger, options);
    },

    onSaving() {
        ghostBookshelf.Model.prototype.onSaving.apply(this, arguments);

        if (this.hasChanged('html')) {
            const sanitizeHtml = require('sanitize-html');

            const html = trimParagraphs(
                sanitizeHtml(this.get('html'), {
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
                })
            ).trim();

            if (html.length === 0) {
                throw new ValidationError({
                    message: tpl(messages.emptyComment)
                });
            }
            this.set('html', html);
        }
    },

    orderAttributes: function orderAttributes() {
        let keys = ghostBookshelf.Model.prototype.orderAttributes.call(this, arguments);
        keys.push('count__likes');
        return keys;
    },

    onCreated: function onCreated(model, options) {
        ghostBookshelf.Model.prototype.onCreated.apply(this, arguments);

        model.emitChange('added', options);
    },

    enforcedFilters: function enforcedFilters(options) {
        // Convenience option to merge all filters with parent_id:null filter
        if (options.parentId !== undefined) {
            if (options.parentId === null) {
                return 'parent_id:null';
            }
            return 'parent_id:\'' + options.parentId + '\'';
        }

        return null;
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

    applyRepliesWithRelatedOption(withRelated, isAdmin) {
        // we want to apply filters when fetching replies so we don't expose data that should be hidden
        // - public requests never return hidden or deleted replies
        // - admin requests never return deleted replies but do return hidden replies
        const repliesOptionIndex = withRelated.indexOf('replies');
        if (repliesOptionIndex > -1) {
            withRelated[repliesOptionIndex] = {
                replies: (qb) => {
                    if (isAdmin) {
                        qb.where('status', '!=', 'deleted');
                    } else {
                        qb.where('status', 'published');
                    }
                }
            };
        }
    },

    /**
     * We have to ensure consistency. If you listen on model events (e.g. `member.added`), you can expect that you always
     * receive all fields including relations. Otherwise you can't rely on a consistent flow. And we want to avoid
     * that event listeners have to re-fetch a resource.
     */
    defaultRelations: function defaultRelations(methodName, options) {
        // @TODO: the default relations are not working for 'add' when we add it below
        // this is because bookshelf does not automatically call `fetch` after adding so
        // our bookshelf eager-load plugin doesn't use the `withRelated` options
        if (['findAll', 'findPage', 'edit', 'findOne', 'destroy'].indexOf(methodName) !== -1) {
            if (!options.withRelated || options.withRelated.length === 0) {
                if (options.parentId) {
                    // Do not include replies for replies
                    options.withRelated = [
                        // Relations
                        'inReplyTo', 'member', 'count.likes', 'count.liked'
                    ];
                } else {
                    options.withRelated = [
                        // Relations
                        'member', 'inReplyTo', 'count.replies', 'count.likes', 'count.liked',
                        // Replies (limited to 3)
                        'replies', 'replies.member', 'replies.inReplyTo', 'replies.count.likes', 'replies.count.liked'
                    ];
                }
            }

            this.applyRepliesWithRelatedOption(options.withRelated, options.isAdmin);
        }

        return options;
    },

    async findPage(options) {
        const {withRelated} = this.defaultRelations('findPage', options);

        const relationsToLoadIndividually = [
            'replies',
            'replies.member',
            'replies.inReplyTo',
            'replies.count.likes',
            'replies.count.liked'
        ].filter(relation => (withRelated.includes(relation) || withRelated.some(r => typeof r === 'object' && r[relation])));

        this.applyRepliesWithRelatedOption(relationsToLoadIndividually, options.isAdmin);

        const result = await ghostBookshelf.Model.findPage.call(this, options);
        for (const model of result.data) {
            await model.load(relationsToLoadIndividually, _.omit(options, 'withRelated'));
        }
        return result;
    },

    countRelations() {
        return {
            replies(modelOrCollection, options) {
                const excludedCommentStatuses = options.isAdmin ? ['deleted'] : ['hidden', 'deleted'];

                modelOrCollection.query('columns', 'comments.*', (qb) => {
                    qb.count('replies.id')
                        .from('comments AS replies')
                        .whereRaw('replies.parent_id = comments.id')
                        .whereNotIn('replies.status', excludedCommentStatuses)
                        .as('count__replies');
                });
            },
            likes(modelOrCollection) {
                modelOrCollection.query('columns', 'comments.*', (qb) => {
                    qb.count('comment_likes.id')
                        .from('comment_likes')
                        .whereRaw('comment_likes.comment_id = comments.id')
                        .as('count__likes');
                });
            },
            liked(modelOrCollection, options) {
                modelOrCollection.query('columns', 'comments.*', (qb) => {
                    if (options.context && options.context.member && options.context.member.id) {
                        qb.count('comment_likes.id')
                            .from('comment_likes')
                            .whereRaw('comment_likes.comment_id = comments.id')
                            .where('comment_likes.member_id', options.context.member.id)
                            .as('count__liked');
                        return;
                    }

                    // Return zero
                    qb.select(ghostBookshelf.knex.raw('0')).as('count__liked');
                });
            }
        };
    },

    /**
     * Returns an array of keys permitted in a method's `options` hash, depending on the current method.
     * @param {String} methodName The name of the method to check valid options for.
     * @return {Array} Keys allowed in the `options` hash of the model's method.
     */
    permittedOptions: function permittedOptions(methodName) {
        let options = ghostBookshelf.Model.permittedOptions.call(this, methodName);
        // The comment model additionally supports having a parentId and isAdmin option
        options.push('parentId');
        options.push('isAdmin');

        return options;
    }
});

module.exports = {
    Comment: ghostBookshelf.model('Comment', Comment)
};
