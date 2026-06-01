const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const {MemberCommentEvent} = require('../../../shared/events');
const DomainEvents = require('@tryghost/domain-events');
const {byNQL} = require('../../models/base/plugins/bulk-filters');

const messages = {
    commentNotFound: 'Comment could not be found',
    memberNotFound: 'Unable to find member',
    likeNotFound: 'Unable to find like',
    alreadyLiked: 'This comment was liked already',
    dislikeNotFound: 'Unable to find dislike',
    alreadyDisliked: 'This comment was disliked already',
    replyToReply: 'Can not reply to a reply',
    commentsNotEnabled: 'Comments are not enabled for this site.',
    cannotCommentOnPost: 'You do not have permission to comment on this post.',
    cannotEditComment: 'You do not have permission to edit comments',
    cannotPinReply: 'Replies cannot be pinned',
    cannotPinDeletedComment: 'Deleted comments cannot be pinned',
    invalidPinnedValue: 'Pinned must be a boolean value',
    commentsPinningNotEnabled: 'Comment pinning is not enabled for this site.'
};

const COMMENT_LIKE_SCORE = 1;
const COMMENT_DISLIKE_SCORE = -1;
const COMMENT_STATUS_PUBLISHED = 'published';
const COMMENT_STATUS_HIDDEN = 'hidden';
const COMMENT_STATUS_DELETED = 'deleted';
const COMMENT_STATUSES_READABLE = [COMMENT_STATUS_PUBLISHED, COMMENT_STATUS_HIDDEN];
const COMMENT_STATUSES_REPLY_PARENT = [COMMENT_STATUS_PUBLISHED, COMMENT_STATUS_HIDDEN, COMMENT_STATUS_DELETED];
const COMMENT_STATUSES_IN_REPLY_TO = [COMMENT_STATUS_PUBLISHED, COMMENT_STATUS_HIDDEN];

function getColumnList(columns) {
    if (!columns) {
        return null;
    }

    if (Array.isArray(columns)) {
        return columns;
    }

    return columns.split(',').map(column => column.trim()).filter(Boolean);
}

function withRequiredColumns(options = {}, requiredColumns = []) {
    const columns = getColumnList(options.columns);

    if (!columns) {
        return {...options};
    }

    return {
        ...options,
        columns: Array.from(new Set([...columns, ...requiredColumns]))
    };
}

function withPinnedSelect(options = {}, {includeHidden = false} = {}) {
    const columns = getColumnList(options.columns);

    if (!columns?.includes('pinned')) {
        return {...options};
    }

    const statusClause = includeHidden ? '' : ' AND comments.status = \'published\'';
    const pinnedSelect = `CASE WHEN comments.parent_id IS NULL AND comments.pinned_at IS NOT NULL${statusClause} THEN 1 ELSE 0 END AS pinned`;

    return {
        ...options,
        selectRaw: [options.selectRaw, pinnedSelect].filter(Boolean).join(', ')
    };
}

function getSafeFetchOptions(options = {}, columns = []) {
    return {
        ...(options.transacting ? {transacting: options.transacting} : {}),
        columns: Array.from(new Set(['id', ...columns]))
    };
}

function getSafeWriteOptions(options = {}) {
    return {
        ...(options.transacting ? {transacting: options.transacting} : {})
    };
}

class CommentsService {
    constructor({config, logging, models, mailer, settingsCache, settingsHelpers, urlService, urlUtils, contentGating, labs}) {
        /** @private */
        this.models = models;

        /** @private */
        this.labs = labs;

        /** @private */
        this.settingsCache = settingsCache;

        /** @private */
        this.contentGating = contentGating;

        const Emails = require('./comments-service-emails');
        /** @private */
        this.emails = new Emails({
            config,
            logging,
            models,
            mailer,
            settingsCache,
            settingsHelpers,
            urlService,
            urlUtils,
            labs
        });
    }

    /**
     * @returns {'off'|'all'|'paid'}
     */
    get enabled() {
        const setting = this.settingsCache.get('comments_enabled');
        if (setting === 'off' || setting === 'all' || setting === 'paid') {
            return setting;
        }
        return 'off';
    }

    /** @private */
    checkEnabled() {
        if (this.enabled === 'off') {
            throw new errors.MethodNotAllowedError({
                message: tpl(messages.commentsNotEnabled)
            });
        }
    }

    /** @private */
    checkCommentAccess(memberModel) {
        if (this.enabled === 'paid' && memberModel.get('status') === 'free') {
            throw new errors.NoPermissionError({
                message: tpl(messages.cannotCommentOnPost)
            });
        }
    }

    /** @private */
    checkPostAccess(postModel, memberModel) {
        const access = this.contentGating.checkPostAccess(postModel.toJSON(), memberModel.toJSON());
        if (access === this.contentGating.BLOCK_ACCESS) {
            throw new errors.NoPermissionError({
                message: tpl(messages.cannotCommentOnPost)
            });
        }
    }

    /** @private */
    async #withTransaction(options, operation) {
        if (options.transacting) {
            return await operation(options);
        }

        return await this.models.Base.transaction(async (transacting) => {
            return await operation({
                ...options,
                transacting
            });
        });
    }

    /** @private */
    async #findCommentByID(id, options = {}, {requiredColumns = [], status, includeHiddenPinned = false} = {}) {
        const query = status ? {id, status} : {id};

        return await this.models.Comment.findOne(
            query,
            withPinnedSelect(withRequiredColumns(options, requiredColumns), {includeHidden: includeHiddenPinned})
        );
    }

    /** @private */
    async #findCommentByIDWithStatuses(id, options = {}, statuses = [], requiredColumns = []) {
        for (const status of statuses) {
            const model = await this.#findCommentByID(id, options, {
                requiredColumns,
                status,
                includeHiddenPinned: options.isAdmin
            });

            if (model) {
                return model;
            }
        }

        return null;
    }

    /** @private */
    async #fetchCommentByID(id, options = {}, {requiredColumns = [], statuses = [], forUpdate = false} = {}) {
        const model = this.models.Comment.forge();
        model.query((qb) => {
            qb.where('comments.id', id);

            if (statuses.length === 1) {
                qb.where('comments.status', statuses[0]);
            } else if (statuses.length > 1) {
                qb.whereIn('comments.status', statuses);
            }

            if (forUpdate && options.transacting && qb.forUpdate) {
                qb.forUpdate();
            }
        });

        return await model.fetch(getSafeFetchOptions(options, requiredColumns));
    }

    /** @private */
    async #getPublishedCommentForAction(id, options = {}, requiredColumns = [], {forUpdate = false} = {}) {
        const model = await this.#fetchCommentByID(id, options, {
            requiredColumns,
            statuses: [COMMENT_STATUS_PUBLISHED],
            forUpdate
        });

        if (!model) {
            throw new errors.NotFoundError({
                message: tpl(messages.commentNotFound)
            });
        }

        return model;
    }

    /** @private */
    async #getReadableCommentByID(id, options = {}, requiredColumns = []) {
        const model = await this.#findCommentByIDWithStatuses(id, options, COMMENT_STATUSES_READABLE, requiredColumns);

        if (!model) {
            throw new errors.NotFoundError({
                message: tpl(messages.commentNotFound)
            });
        }

        return model;
    }

    /** @private */
    async #getReplyParentCommentByID(id, options = {}) {
        // Deleted parent comments intentionally remain valid thread anchors when
        // a reply races with deletion or an existing thread has live descendants.
        const model = await this.#findCommentByIDWithStatuses(id, options, COMMENT_STATUSES_REPLY_PARENT, ['id', 'parent_id', 'post_id']);

        if (!model) {
            throw new errors.NotFoundError({
                message: tpl(messages.commentNotFound)
            });
        }

        return model;
    }

    /** @private */
    async #getInReplyToCommentByID(id, parent, options = {}) {
        const model = await this.#findCommentByIDWithStatuses(id, options, COMMENT_STATUSES_IN_REPLY_TO, ['id', 'parent_id']);

        if (model) {
            if (model.get('parent_id') !== parent) {
                return null;
            }

            return model;
        }

        const deletedModel = await this.#fetchCommentByID(id, options, {
            statuses: [COMMENT_STATUS_DELETED]
        });

        if (!deletedModel) {
            throw new errors.NotFoundError({
                message: tpl(messages.commentNotFound)
            });
        }

        return null;
    }

    /** @private */
    async #getMemberCommentVotes({commentId, memberId, score}, options) {
        const collection = this.models.CommentLike.forge();
        collection.query((qb) => {
            qb.where('comment_likes.comment_id', commentId)
                .where('comment_likes.member_id', memberId);

            if (score !== undefined) {
                qb.where('comment_likes.score', score);
            }

            qb.orderBy('comment_likes.created_at', 'asc');
        });

        const votes = await collection.fetchAll(options);

        return votes.models || [];
    }

    /** @private */
    async #destroyCommentVotes(votes, options) {
        await Promise.all(votes.map(vote => vote.destroy(options)));
    }

    /** @private */
    async #setCommentVote(commentId, member, targetScore, alreadyMessage, options = {}) {
        const memberModel = await this.models.Member.findOne({
            id: member.id
        }, {
            require: true,
            ...options,
            withRelated: ['products']
        });

        this.checkCommentAccess(memberModel);

        return await this.#withTransaction(options, async (transactionOptions) => {
            await this.#getPublishedCommentForAction(commentId, transactionOptions, [], {forUpdate: true});

            const votes = await this.#getMemberCommentVotes({
                commentId,
                memberId: memberModel.id
            }, transactionOptions);
            const alreadyHasSingleTargetVote = votes.length === 1 && Number(votes[0].get('score')) === targetScore;

            if (alreadyHasSingleTargetVote) {
                throw new errors.BadRequestError({
                    message: tpl(alreadyMessage)
                });
            }

            await this.#destroyCommentVotes(votes, transactionOptions);

            return await this.models.CommentLike.add({
                member_id: memberModel.id,
                comment_id: commentId,
                score: targetScore
            }, transactionOptions);
        });
    }

    /** @private */
    async #clearCommentVote(commentId, member, targetScore, notFoundMessage, options = {}) {
        await this.#withTransaction(options, async (transactionOptions) => {
            await this.#getPublishedCommentForAction(commentId, transactionOptions, [], {forUpdate: true});

            const votesToRemove = await this.#getMemberCommentVotes({
                commentId,
                memberId: member.id,
                score: targetScore
            }, transactionOptions);

            if (votesToRemove.length === 0) {
                throw new errors.NotFoundError({
                    message: tpl(notFoundMessage)
                });
            }

            await this.#destroyCommentVotes(votesToRemove, transactionOptions);
        });
    }

    /** @private */
    async sendNewCommentNotifications(comment) {
        await this.emails.notifyPostAuthors(comment);

        if (comment.get('parent_id')) {
            await this.emails.notifyParentCommentAuthor(comment, {type: 'parent'});
        }
        if (comment.get('in_reply_to_id')) {
            await this.emails.notifyParentCommentAuthor(comment, {type: 'in_reply_to'});
        }
    }

    async likeComment(commentId, member, options = {}) {
        this.checkEnabled();

        return await this.#setCommentVote(commentId, member, COMMENT_LIKE_SCORE, messages.alreadyLiked, options);
    }

    async unlikeComment(commentId, member, options = {}) {
        this.checkEnabled();

        await this.#clearCommentVote(commentId, member, COMMENT_LIKE_SCORE, messages.likeNotFound, options);
    }

    async dislikeComment(commentId, member, options = {}) {
        this.checkEnabled();

        return await this.#setCommentVote(commentId, member, COMMENT_DISLIKE_SCORE, messages.alreadyDisliked, options);
    }

    async undislikeComment(commentId, member, options = {}) {
        this.checkEnabled();

        await this.#clearCommentVote(commentId, member, COMMENT_DISLIKE_SCORE, messages.dislikeNotFound, options);
    }

    async reportComment(commentId, reporter, options = {}) {
        this.checkEnabled();
        const comment = await this.#getPublishedCommentForAction(commentId, options, ['id', 'post_id', 'member_id', 'html', 'created_at']);
        const writeOptions = getSafeWriteOptions(options);

        // Check if this reporter already reported this comment (then don't send an email)?
        const existing = await this.models.CommentReport.findOne({
            comment_id: comment.id,
            member_id: reporter.id
        }, writeOptions);

        if (existing) {
            // Ignore silently for now
            return;
        }

        // Save report model
        await this.models.CommentReport.add({
            comment_id: comment.id,
            member_id: reporter.id
        }, writeOptions);

        await this.emails.notifyReport(comment, reporter);
    }

    /**
     * @param {any} options
     */
    async getComments(options) {
        this.checkEnabled();
        const pinnedFirst = this.labs?.isSet('commentsPinning');
        const page = await this.models.Comment.findPage(withPinnedSelect({...options, parentId: null, pinnedFirst}));

        return page;
    }

    /**
     * @typedef {Object} AdminBrowseAllOptions
     * @property {boolean} includeNested - If true, include replies in flat list; if false, only top-level comments
     * @property {string[]} [withRelated] - Relations to include (e.g. ['member', 'post'])
     * @property {string} [filter] - NQL filter string
     * @property {Function} [mongoTransformer] - Function to transform parsed NQL filter
     * @property {{op: string, value: number}} [reportCount] - Filter by report count (op: '=', '>', '>=', '<', '<=', '!=')
     * @property {string} order - Order string (e.g. 'created_at desc')
     * @property {number} [page] - Page number
     * @property {number} [limit] - Results per page
     */

    /**
     * Browse all comments across the site for admin moderation.
     * Does not check if comments are enabled - admins can moderate existing comments.
     *
     * Service responsibility: Business logic and data access.
     * Receives clean, typed parameters - no frame/HTTP knowledge.
     *
     * @param {AdminBrowseAllOptions} options
     */
    async getAdminAllComments({includeNested, filter, mongoTransformer, reportCount, order, page, limit}) {
        const withRelated = ['member', 'post', 'post.tags', 'post.authors', 'count.replies', 'count.direct_replies', 'count.likes', 'count.dislikes', 'count.net_score', 'count.reports', 'in_reply_to', 'parent'];

        return await this.models.Comment.findPage({
            withRelated,
            filter,
            mongoTransformer,
            reportCount,
            order,
            page,
            limit,
            parentId: includeNested ? undefined : null,
            isAdmin: true,
            browseAll: true
        });
    }

    async getAdminComments(options) {
        this.checkEnabled();
        const pinnedFirst = this.labs?.isSet('commentsPinning');
        const page = await this.models.Comment.findPage(withPinnedSelect({
            ...options,
            parentId: null,
            isAdmin: true,
            pinnedFirst
        }, {includeHidden: true}));

        return page;
    }

    async moderateComment(id, data, options) {
        const editData = {};

        if (Object.prototype.hasOwnProperty.call(data, 'status')) {
            editData.status = data.status;

            if (data.status === 'deleted') {
                editData.pinned_at = null;
            }
        }

        if (Object.prototype.hasOwnProperty.call(data, 'pinned')) {
            if (!this.labs?.isSet('commentsPinning')) {
                throw new errors.MethodNotAllowedError({
                    message: tpl(messages.commentsPinningNotEnabled)
                });
            }

            if (typeof data.pinned !== 'boolean') {
                throw new errors.BadRequestError({
                    message: tpl(messages.invalidPinnedValue)
                });
            }

            let existingComment;
            if (data.pinned) {
                existingComment = await this.models.Comment.findOne({id}, {require: true});

                if (existingComment.get('parent_id') !== null) {
                    throw new errors.BadRequestError({
                        message: tpl(messages.cannotPinReply)
                    });
                }

                if (existingComment.get('status') === 'deleted' || data.status === 'deleted') {
                    throw new errors.BadRequestError({
                        message: tpl(messages.cannotPinDeletedComment)
                    });
                }
            }

            editData.pinned_at = data.pinned ? existingComment.get('pinned_at') || new Date() : null;
        }

        return await this.models.Comment.edit(editData, {
            id,
            require: true,
            ...options
        });
    }

    /**
     * @param {string} id - The ID of the Comment to get replies from
     * @param {any} options
     */
    async getReplies(id, options, {includeHidden = false} = {}) {
        this.checkEnabled();
        const page = await this.models.Comment.findPage(withPinnedSelect({...options, parentId: id}, {includeHidden}));

        return page;
    }

    async getAdminReplies(id, options) {
        return await this.getReplies(id, {
            ...options,
            isAdmin: true
        }, {includeHidden: true});
    }

    /**
     * Get reporters for a comment (admin only)
     * @param {string} commentId - The ID of the Comment to get reporters for
     * @param {any} options - Query options (page, limit)
     */
    async getCommentReporters(commentId, options = {}) {
        const comment = await this.models.Comment.findOne({id: commentId});
        if (!comment) {
            throw new errors.NotFoundError({
                message: tpl(messages.commentNotFound)
            });
        }

        const {page, limit} = options;
        const result = await this.models.CommentReport.findPage({
            filter: `comment_id:'${commentId}'`,
            withRelated: ['member'],
            order: 'created_at desc',
            page,
            limit
        });

        return result;
    }

    /**
     * Get likes for a comment (admin only)
     * @param {string} commentId - The ID of the Comment to get likes for
     * @param {any} options - Query options (page, limit)
     */
    async getCommentLikes(commentId, options = {}) {
        const comment = await this.models.Comment.findOne({id: commentId});
        if (!comment) {
            throw new errors.NotFoundError({
                message: tpl(messages.commentNotFound)
            });
        }

        const {page, limit} = options;
        const result = await this.models.CommentLike.findPage({
            filter: `comment_id:'${commentId}'+score:${COMMENT_LIKE_SCORE}`,
            withRelated: ['member'],
            order: 'created_at desc',
            page,
            limit
        });

        return result;
    }

    /**
     * Get dislikes for a comment (admin only)
     * @param {string} commentId - The ID of the Comment to get dislikes for
     * @param {any} options - Query options (page, limit)
     */
    async getCommentDislikes(commentId, options = {}) {
        const comment = await this.models.Comment.findOne({id: commentId});
        if (!comment) {
            throw new errors.NotFoundError({
                message: tpl(messages.commentNotFound)
            });
        }

        const {page, limit} = options;
        const result = await this.models.CommentLike.findPage({
            filter: `comment_id:'${commentId}'+score:${COMMENT_DISLIKE_SCORE}`,
            withRelated: ['member'],
            order: 'created_at desc',
            page,
            limit
        });

        return result;
    }

    async getCommentByID(id, options = {}) {
        this.checkEnabled();

        return await this.#getReadableCommentByID(id, options, ['status']);
    }

    /**
     * @param {string} post - The ID of the Post to comment on
     * @param {string} member - The ID of the Member to comment as
     * @param {string} comment - The HTML content of the Comment
     * @param {any} options
     * @param {Date} [createdAt] - Optional custom created_at timestamp
     */
    async commentOnPost(post, member, comment, options, createdAt) {
        this.checkEnabled();
        const memberModel = await this.models.Member.findOne({
            id: member
        }, {
            require: true,
            ...options,
            withRelated: ['products']
        });

        this.checkCommentAccess(memberModel);

        const postModel = await this.models.Post.findOne({
            id: post
        }, {
            require: true,
            ...options,
            withRelated: ['tiers']
        });

        this.checkPostAccess(postModel, memberModel);

        const commentData = {
            post_id: post,
            member_id: member,
            parent_id: null,
            html: comment,
            status: 'published'
        };

        if (createdAt) {
            commentData.created_at = createdAt;
        }

        const model = await this.models.Comment.add(commentData, options);

        if (!options.context.internal) {
            await this.sendNewCommentNotifications(model);
        }

        DomainEvents.dispatch(MemberCommentEvent.create({
            memberId: member,
            postId: post,
            commentId: model.id
        }));

        // Instead of returning the model, fetch it again, so we have all the relations properly fetched
        return await this.models.Comment.findOne({id: model.id}, {...options, require: true});
    }

    /**
     * @param {string} parent - The ID of the Comment to reply to
     * @param {string} inReplyTo - The ID of the Reply to reply to
     * @param {string} member - The ID of the Member to comment as
     * @param {string} comment - The HTML content of the Comment
     * @param {any} options
     * @param {Date} [createdAt] - Optional custom created_at timestamp
     */
    async replyToComment(parent, inReplyTo, member, comment, options, createdAt) {
        this.checkEnabled();
        const memberModel = await this.models.Member.findOne({
            id: member
        }, {
            require: true,
            ...options,
            withRelated: ['products']
        });

        this.checkCommentAccess(memberModel);

        const parentComment = await this.#getReplyParentCommentByID(parent, options);

        if (parentComment.get('parent_id') !== null) {
            throw new errors.BadRequestError({
                message: tpl(messages.replyToReply)
            });
        }

        const postModel = await this.models.Post.findOne({
            id: parentComment.get('post_id')
        }, {
            require: true,
            ...options,
            withRelated: ['tiers']
        });

        this.checkPostAccess(postModel, memberModel);

        let inReplyToComment;
        if (parent && inReplyTo) {
            inReplyToComment = await this.#getInReplyToCommentByID(inReplyTo, parent, options);
        }

        const commentData = {
            post_id: parentComment.get('post_id'),
            member_id: member,
            parent_id: parentComment.id,
            in_reply_to_id: inReplyToComment && inReplyToComment.get('id'),
            html: comment,
            status: 'published'
        };

        if (createdAt) {
            commentData.created_at = createdAt;
        }

        const model = await this.models.Comment.add(commentData, options);

        if (!options.context.internal) {
            await this.sendNewCommentNotifications(model);
        }

        DomainEvents.dispatch(MemberCommentEvent.create({
            memberId: member,
            postId: parentComment.get('post_id'),
            commentId: model.id
        }));

        // Instead of returning the model, fetch it again, so we have all the relations properly fetched
        return await this.models.Comment.findOne({id: model.id}, {...options, require: true});
    }

    /**
     * @param {string} id - The ID of the Comment to delete
     * @param {string} member - The ID of the Member to delete as
     * @param {any} options
     */
    async deleteComment(id, member, options) {
        this.checkEnabled();
        const existingComment = await this.#getPublishedCommentForAction(id, options, ['member_id']);

        if (existingComment.get('member_id') !== member) {
            throw new errors.NoPermissionError({
                // todo fix message
                message: tpl(messages.memberNotFound)
            });
        }

        const model = await this.models.Comment.edit({
            status: 'deleted',
            pinned_at: null
        }, {
            id,
            require: true,
            ...options
        });

        return model;
    }

    /**
     * @param {string} id - The ID of the Comment to edit
     * @param {string} member - The ID of the Member to edit as
     * @param {string} comment - The new HTML content of the Comment
     * @param {any} options
     */
    async editCommentContent(id, member, comment, options) {
        this.checkEnabled();
        const existingComment = await this.#getPublishedCommentForAction(id, options, ['member_id']);

        if (existingComment.get('member_id') !== member) {
            throw new errors.NoPermissionError({
                message: tpl(messages.cannotEditComment)
            });
        }

        if (!comment) {
            return existingComment;
        }

        const model = await this.models.Comment.edit({
            html: comment,
            edited_at: new Date()
        }, {
            id,
            require: true,
            ...options
        });

        return model;
    }

    /**
     * Bulk update comment status based on NQL filter
     * @param {string} filter - NQL filter string (e.g., "member_id:'abc123'+status:published")
     * @param {string} status - New status ('hidden', 'published', 'deleted')
     */
    async bulkUpdateStatus(filter, status) {
        await this.models.Comment.bulkEditWhere({
            data: {status},
            where: byNQL(filter)
        });
    }

    async getMemberIdByUUID(uuid, options) {
        const member = await this.models.Member.findOne({uuid}, options);

        if (!member) {
            throw new errors.NotFoundError({
                message: tpl(messages.memberNotFound)
            });
        }

        return member.id;
    }
}

module.exports = CommentsService;
