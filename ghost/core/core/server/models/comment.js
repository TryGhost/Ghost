const ghostBookshelf = require('./base');
const _ = require('lodash');
const tpl = require('@tryghost/tpl');
const {ValidationError} = require('@tryghost/errors');

const messages = {
    emptyComment: 'The body of a comment cannot be empty'
};

function getDisplayableCommentIdsQuery(excludedStatuses, {parentId, parentIds, postId} = {}) {
    const statusPlaceholders = excludedStatuses.map(() => '?').join(',');
    const scopedParentIds = parentId ? [parentId] : parentIds;
    const scopeFilter = {
        sql: [
            scopedParentIds?.length ? `AND comments.parent_id IN (${scopedParentIds.map(() => '?').join(',')})` : '',
            postId ? 'AND comments.post_id = ?' : ''
        ].filter(Boolean).join('\n              '),
        bindings: [
            ...(scopedParentIds?.length ? scopedParentIds : []),
            ...(postId ? [postId] : [])
        ]
    };

    return ghostBookshelf.knex.raw(`
        WITH RECURSIVE displayable_comment_paths(visible_id, comment_id) AS (
            SELECT comments.id, comments.id
            FROM comments
            WHERE comments.status NOT IN (${statusPlaceholders})
              ${scopeFilter.sql}

            UNION

            SELECT displayable_comment_paths.visible_id,
                CASE
                    WHEN comments.in_reply_to_id IS NOT NULL THEN comments.in_reply_to_id
                    ELSE comments.parent_id
                END
            FROM comments
            INNER JOIN displayable_comment_paths ON comments.id = displayable_comment_paths.comment_id
            WHERE (comments.in_reply_to_id IS NOT NULL OR comments.parent_id IS NOT NULL)
              ${scopeFilter.sql}
        )

        SELECT comment_id AS id
        FROM displayable_comment_paths
        GROUP BY comment_id
    `, [...excludedStatuses, ...scopeFilter.bindings, ...scopeFilter.bindings]);
}

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

    in_reply_to() {
        return this.belongsTo('Comment', 'in_reply_to_id');
    },

    likes() {
        return this.hasMany('CommentLike', 'comment_id');
    },

    replies() {
        return this.hasMany('Comment', 'parent_id', 'id')
            .query('orderBy', 'created_at', 'ASC');
    },

    // Called by our filtered-collection bookshelf plugin
    applyCustomQuery(options) {
        const excludedStatuses = options.isAdmin ? ['deleted'] : ['hidden', 'deleted'];

        this.query((qb) => {
            if (options.browseAll) {
                // Browse All: simply exclude statuses, no thread structure preservation
                qb.whereNotIn('comments.status', excludedStatuses);
            } else {
                // Default: preserve thread structure by including tombstones with visible descendants
                qb.whereIn('comments.id', getDisplayableCommentIdsQuery(excludedStatuses, {parentId: options.parentId, postId: options.post_id}));
            }

            // Filter by report count (extracted from filter in controller)
            if (options.reportCount !== undefined) {
                const subquery = '(SELECT COUNT(*) FROM comment_reports WHERE comment_reports.comment_id = comments.id)';
                qb.whereRaw(`${subquery} ${options.reportCount.op} ?`, [options.reportCount.value]);
            }

            if (options.pinnedFirst) {
                if (options.isAdmin) {
                    qb.orderBy('comments.pinned_at', 'DESC');
                } else {
                    qb.orderByRaw('CASE WHEN comments.status = ? THEN comments.pinned_at END DESC', ['published']);
                }
            }
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
        keys.push('count__net_score');
        keys.push('count__reports');
        return keys;
    },

    onCreated: function onCreated(model, options) {
        const result = ghostBookshelf.Model.prototype.onCreated.apply(this, arguments);

        model.emitChange('added', options);

        return result;
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

    applyRepliesWithRelatedOption(withRelated, isAdmin, parentIds) {
        // we want to apply filters when fetching replies so we don't expose data that should be hidden
        // - public requests never return hidden or deleted replies
        // - admin requests never return deleted replies but do return hidden replies
        // - unpublished replies are returned as tombstones when they preserve the path to visible descendants
        const repliesOptionIndex = withRelated.indexOf('replies');
        if (repliesOptionIndex > -1) {
            const excludedStatuses = isAdmin ? ['deleted'] : ['hidden', 'deleted'];
            withRelated[repliesOptionIndex] = {
                replies: (qb) => {
                    qb.whereIn('comments.id', getDisplayableCommentIdsQuery(excludedStatuses, {parentIds}));
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
                const reactionRelations = ['count.likes', 'count.liked', 'count.disliked', 'count.net_score'];
                const replyReactionRelations = ['replies.count.likes', 'replies.count.liked', 'replies.count.disliked'];

                if (options.isAdmin) {
                    reactionRelations.push('count.dislikes');
                    replyReactionRelations.push('replies.count.dislikes');
                }

                if (options.parentId) {
                    // Do not include replies for replies
                    options.withRelated = [
                        // Relations
                        'in_reply_to', 'member', 'count.direct_replies', ...reactionRelations
                    ];

                    // Add count.reports for admin requests only
                    if (options.isAdmin) {
                        options.withRelated.push('count.reports');
                    }
                } else {
                    options.withRelated = [
                        // Relations
                        'member', 'in_reply_to', 'count.replies', 'count.direct_replies', ...reactionRelations,
                        'replies', 'replies.member', 'replies.in_reply_to',
                        'replies.count.direct_replies', ...replyReactionRelations
                    ];

                    // Add count.reports for admin requests only
                    if (options.isAdmin) {
                        options.withRelated.push('count.reports');
                        options.withRelated.push('replies.count.reports');
                    }
                }
            }

            if (methodName !== 'findPage') {
                const parentIds = options.id ? [options.id] : undefined;
                this.applyRepliesWithRelatedOption(options.withRelated, options.isAdmin, parentIds);
            }
        }

        return options;
    },

    async findPage(options) {
        const {withRelated} = this.defaultRelations('findPage', options);

        // Identify reply-related relations to load separately in batch
        const replyRelationKeys = [
            'replies', 'replies.member', 'replies.in_reply_to',
            'replies.count.direct_replies', 'replies.count.likes', 'replies.count.dislikes', 'replies.count.liked', 'replies.count.disliked'
        ];
        if (options.isAdmin) {
            replyRelationKeys.push('replies.count.reports');
        }

        // Remove reply relations from options.withRelated to avoid double-loading
        // and collect them for batch loading via Collection.load()
        const relationsToLoadInBatch = [];
        const isReplyRelation = (rel) => {
            const name = typeof rel === 'string' ? rel : Object.keys(rel)[0];
            return replyRelationKeys.includes(name);
        };
        options.withRelated = withRelated.filter((rel) => {
            if (isReplyRelation(rel)) {
                relationsToLoadInBatch.push(rel);
                return false;
            }
            return true;
        });

        // Base findPage WITHOUT reply relations
        const result = await ghostBookshelf.Model.findPage.call(this, options);

        // Batch-load reply relations for ALL comments at once using Collection.load()
        // instead of the previous N+1 per-model model.load() loop
        if (result.data.length > 0 && relationsToLoadInBatch.length > 0) {
            const parentIds = result.data.map(model => model.id);
            this.applyRepliesWithRelatedOption(relationsToLoadInBatch, options.isAdmin, parentIds);

            const collection = ghostBookshelf.Collection.forge(result.data, {model: this});
            await collection.load(relationsToLoadInBatch, _.omit(options, 'withRelated', 'columns', 'selectRaw'));
        }

        return result;
    },

    countRelations() {
        return {
            replies(modelOrCollection, options) {
                const excludedCommentStatuses = options.isAdmin ? ['deleted'] : ['hidden', 'deleted'];

                // Counts represent visible comment content, not structural tombstones. The API can still
                // return hidden/deleted ancestors in `replies` when they preserve paths to visible descendants.
                modelOrCollection.query('columns', 'comments.*', (qb) => {
                    qb.count('r.id')
                        .from('comments AS r')
                        .whereRaw('r.parent_id = comments.id')
                        .whereNotIn('r.status', excludedCommentStatuses)
                        .as('count__replies');
                });
            },
            direct_replies(modelOrCollection, options) {
                const excludedCommentStatuses = options.isAdmin ? ['deleted'] : ['hidden', 'deleted'];
                const statusPlaceholders = excludedCommentStatuses.map(() => '?').join(',');

                // Counts represent visible comment content, not structural tombstones. The API can still
                // return hidden/deleted ancestors in `replies` when they preserve paths to visible descendants.
                // Split into two separate indexed subqueries instead of a single OR-based query.
                // An OR between parent_id and in_reply_to_id defeats MySQL index usage,
                // causing full table scans. Two separate subqueries each use their own index.
                modelOrCollection.query('columns', 'comments.*', ghostBookshelf.knex.raw(`(
                    (SELECT COUNT(*) FROM comments AS r1
                     WHERE r1.parent_id = comments.id
                       AND r1.in_reply_to_id IS NULL
                       AND r1.status NOT IN (${statusPlaceholders}))
                    +
                    (SELECT COUNT(*) FROM comments AS r2
                     WHERE r2.in_reply_to_id = comments.id
                       AND r2.status NOT IN (${statusPlaceholders}))
                ) as count__direct_replies`, [...excludedCommentStatuses, ...excludedCommentStatuses]));
            },
            likes(modelOrCollection) {
                modelOrCollection.query('columns', 'comments.*', (qb) => {
                    qb.count('comment_likes.id')
                        .from('comment_likes')
                        .whereRaw('comment_likes.comment_id = comments.id')
                        .where('comment_likes.score', 1)
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
                            .where('comment_likes.score', 1)
                            .as('count__liked');
                        return;
                    }

                    // Return zero
                    qb.select(ghostBookshelf.knex.raw('0')).as('count__liked');
                });
            },
            dislikes(modelOrCollection) {
                modelOrCollection.query('columns', 'comments.*', (qb) => {
                    qb.count('comment_likes.id')
                        .from('comment_likes')
                        .whereRaw('comment_likes.comment_id = comments.id')
                        .where('comment_likes.score', -1)
                        .as('count__dislikes');
                });
            },
            disliked(modelOrCollection, options) {
                modelOrCollection.query('columns', 'comments.*', (qb) => {
                    if (options.context && options.context.member && options.context.member.id) {
                        qb.count('comment_likes.id')
                            .from('comment_likes')
                            .whereRaw('comment_likes.comment_id = comments.id')
                            .where('comment_likes.member_id', options.context.member.id)
                            .where('comment_likes.score', -1)
                            .as('count__disliked');
                        return;
                    }

                    // Return zero
                    qb.select(ghostBookshelf.knex.raw('0')).as('count__disliked');
                });
            },
            net_score(modelOrCollection) {
                modelOrCollection.query('columns', 'comments.*', ghostBookshelf.knex.raw(`(
                    SELECT COALESCE(SUM(comment_likes.score), 0)
                    FROM comment_likes
                    WHERE comment_likes.comment_id = comments.id
                ) as count__net_score`));
            },
            reports(modelOrCollection) {
                modelOrCollection.query('columns', 'comments.*', (qb) => {
                    qb.count('comment_reports.id')
                        .from('comment_reports')
                        .whereRaw('comment_reports.comment_id = comments.id')
                        .as('count__reports');
                });
            }
        };
    },

    /**
     * Returns an array of keys permitted in a method's `options` hash, depending on the current method.
     * @param {string} methodName The name of the method to check valid options for.
     * @return {Array} Keys allowed in the `options` hash of the model's method.
     */
    permittedOptions: function permittedOptions(methodName) {
        let options = ghostBookshelf.Model.permittedOptions.call(this, methodName);
        options.push('parentId');
        options.push('isAdmin');
        options.push('browseAll');
        options.push('reportCount');
        options.push('pinnedFirst');
        if (methodName === 'findPage') {
            options.push('post_id');
        }
        options.push('selectRaw');

        return options;
    }
});

module.exports = {
    Comment: ghostBookshelf.model('Comment', Comment)
};
