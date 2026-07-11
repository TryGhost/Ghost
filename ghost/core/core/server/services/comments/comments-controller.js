const _ = require('lodash');
const errors = require('@tryghost/errors');
const nql = require('@tryghost/nql');
const {splitFilter} = require('@tryghost/mongo-utils');

/**
 * @typedef {import('@tryghost/api-framework').Frame} Frame
 */

const {MethodNotAllowedError} = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const messages = {
    cannotDestroyComments: 'You cannot destroy comments.',
    memberNotFound: 'Unable to find member',
    unsupportedReportCountFilter: 'Unsupported count.reports filter'
};

module.exports = class CommentsController {
    /**
     * @param {import('./comments-service')} service
     * @param {import('./comments-stats-service')} stats
     */
    constructor(service, stats) {
        this.service = service;
        this.stats = stats;
    }

    #withPostFilter(options) {
        const nextOptions = {...options};

        if (!options.post_id) {
            return nextOptions;
        }

        if (options.filter) {
            const postId = options.post_id;
            const existingTransformer = options.mongoTransformer;
            nextOptions.mongoTransformer = function (query) {
                const transformedQuery = existingTransformer ? existingTransformer(query) : query;

                return {
                    $and: [
                        {
                            post_id: postId
                        },
                        transformedQuery
                    ]
                };
            };
        } else {
            nextOptions.filter = `post_id:${options.post_id}`;
        }

        return nextOptions;
    }

    async #withImpersonationContext(options) {
        const nextOptions = {...options};

        if (!options.impersonate_member_uuid) {
            return nextOptions;
        }

        nextOptions.context = {
            ...options.context,
            member: {
                ...options.context?.member,
                id: await this.service.getMemberIdByUUID(options.impersonate_member_uuid)
            }
        };

        return nextOptions;
    }

    #checkMember(frame) {
        if (!frame.options?.context?.member?.id) {
            throw new errors.UnauthorizedError({
                message: tpl(messages.memberNotFound)
            });
        }
    }

    /**
     * Extract count.reports from filter string.
     * Returns the remaining filter, a reportCount option, and a mongoTransformer.
     *
     * @param {string} [filterString]
     * @returns {{filter: string|undefined, reportCount: {op: string, value: number}|undefined, mongoTransformer: Function|undefined}}
     */
    #extractReportCountFilter(filterString) {
        if (!filterString || !filterString.includes('count.reports')) {
            return {filter: filterString, reportCount: undefined, mongoTransformer: undefined};
        }

        const parsed = nql(filterString).parse();
        const [countReportsFilter, remainingFilter] = splitFilter(parsed, ['count.reports']);

        // Convert count.reports to reportCount option
        let reportCount;
        if (countReportsFilter?.['count.reports'] !== undefined) {
            const val = countReportsFilter['count.reports'];
            if (typeof val === 'number') {
                reportCount = {op: '=', value: val};
            } else if (val.$gt !== undefined) {
                reportCount = {op: '>', value: val.$gt};
            } else if (val.$gte !== undefined) {
                reportCount = {op: '>=', value: val.$gte};
            } else if (val.$lt !== undefined) {
                reportCount = {op: '<', value: val.$lt};
            } else if (val.$lte !== undefined) {
                reportCount = {op: '<=', value: val.$lte};
            } else if (val.$ne !== undefined) {
                reportCount = {op: '!=', value: val.$ne};
            }

            if (!reportCount) {
                throw new errors.BadRequestError({
                    message: tpl(messages.unsupportedReportCountFilter)
                });
            }
        }

        // If there's remaining filter, use transformer to replace parsed result
        // Otherwise, no filter needed
        if (remainingFilter && Object.keys(remainingFilter).length > 0) {
            return {
                filter: filterString, // Keep original string for NQL to parse
                reportCount,
                mongoTransformer: () => remainingFilter // Replace with our pre-split result
            };
        }

        return {filter: undefined, reportCount, mongoTransformer: undefined};
    }

    /**
     * @param {Frame} frame
     */
    async browse(frame) {
        return await this.service.getComments(this.#withPostFilter(frame.options));
    }

    async adminBrowse(frame) {
        let options = this.#withPostFilter(frame.options);
        options = {
            ...options,
            isAdmin: true
        };
        // Admin routes in Comments-UI lack member context due to cross-domain constraints (CORS), which prevents
        // credentials from being passed. This causes issues like the inability to determine if a
        // logged-in admin (acting on behalf of a member) has already liked a comment.
        // To resolve this, we retrieve the `impersonate_member_uuid` from the request params and
        // explicitly set it in the context options as the acting member's ID.
        // Note: This approach is applied to several admin routes where member context is required.
        options = await this.#withImpersonationContext(options);
        return await this.service.getAdminComments(options);
    }

    /**
     * Browse all comments across the site (admin only, no post_id required)
     * Used for admin moderation page showing comments from all posts
     *
     * Controller responsibility: Parse frame into clean domain parameters.
     * The frame should not pass beyond this layer.
     *
     * @param {Frame} frame
     */
    async adminBrowseAll(frame) {
        // Query params can be strings or booleans depending on how the request is made
        const includeNestedParam = frame.options.include_nested;
        const includeNested = includeNestedParam !== 'false' && includeNestedParam !== false;

        // Extract count.reports from filter (it needs special handling as raw SQL)
        const {filter, reportCount, mongoTransformer} = this.#extractReportCountFilter(frame.options.filter);

        return await this.service.getAdminAllComments({
            includeNested,
            filter,
            mongoTransformer,
            reportCount,
            order: frame.options.order || 'created_at desc',
            page: frame.options.page,
            limit: frame.options.limit
        });
    }

    async adminEdit(frame) {
        const data = frame.data.comments[0];
        const updates = {};
        if (Object.prototype.hasOwnProperty.call(data, 'status')) {
            updates.status = data.status;
        }
        if (Object.prototype.hasOwnProperty.call(data, 'pinned')) {
            updates.pinned = data.pinned;
        }

        const result = await this.service.moderateComment(
            frame.options.id,
            updates,
            frame.options
        );

        this.setCacheInvalidationHeaders(result, frame);

        return result;
    }

    /**
     * Sets the X-Cache-Invalidate response header so the public/member-facing
     * comments endpoints get evicted when a comment is mutated. Shared with
     * the comments endpoint module so both sites stay in sync.
     */
    setCacheInvalidationHeaders(model, frame) {
        if (!model) {
            return;
        }

        const postId = model.get('post_id');
        const parentId = model.get('parent_id');
        const pathsToInvalidate = [
            postId ? `/api/members/comments/post/${postId}/` : null,
            parentId ? `/api/members/comments/${parentId}/replies/` : null,
            `/api/members/comments/${model.id}/`
        ].filter(path => path !== null);

        frame.setHeader('X-Cache-Invalidate', pathsToInvalidate.join(', '));
    }

    /**
     * @param {Frame} frame
     */
    async replies(frame) {
        return this.service.getReplies(frame.options.id, _.omit(frame.options, 'id'));
    }

    /**
     * @param {Frame} frame
     */
    async adminReplies(frame) {
        let options = {
            ...frame.options,
            order: 'created_at asc' // we always want to load replies from oldest to newest
        };
        options = await this.#withImpersonationContext(options);

        return this.service.getAdminReplies(frame.options.id, _.omit(options, 'id'));
    }

    /**
     * @param {Frame} frame
     */
    async read(frame) {
        const options = await this.#withImpersonationContext(frame.options);
        return await this.service.getCommentByID(frame.data.id, options);
    }

    /**
     * @param {Frame} frame
     */
    async adminRead(frame) {
        let options = {
            ...frame.options,
            isAdmin: true
        };
        options = await this.#withImpersonationContext(options);

        return await this.service.getCommentByID(frame.data.id, options);
    }

    /**
     * @param {Frame} frame
     */
    async edit(frame) {
        this.#checkMember(frame);

        let result;
        if (frame.data.comments[0].status === 'deleted') {
            result = await this.service.deleteComment(
                frame.options.id,
                frame?.options?.context?.member?.id,
                frame.options
            );
        } else {
            result = await this.service.editCommentContent(
                frame.options.id,
                frame?.options?.context?.member?.id,
                frame.data.comments[0].html,
                frame.options
            );
        }

        this.setCacheInvalidationHeaders(result, frame);

        return result;
    }

    /**
     * @param {Frame} frame
     */
    async add(frame) {
        this.#checkMember(frame);
        const data = frame.data.comments[0];

        let result;
        if (data.parent_id) {
            result = await this.service.replyToComment(
                data.parent_id,
                data.in_reply_to_id,
                frame.options.context.member.id,
                data.html,
                frame.options
            );
        } else {
            result = await this.service.commentOnPost(
                data.post_id,
                frame.options.context.member.id,
                data.html,
                frame.options
            );
        }

        this.setCacheInvalidationHeaders(result, frame);

        return result;
    }

    async destroy() {
        throw new MethodNotAllowedError({
            message: tpl(messages.cannotDestroyComments)
        });
    }

    async count(frame) {
        if (!frame?.options?.ids) {
            return await this.stats.getAllCounts();
        }

        const ids = frame?.options?.ids.split(',');

        return await this.stats.getCountsByPost(ids);
    }

    /**
     * @param {Frame} frame
     */
    async like(frame) {
        this.#checkMember(frame);

        const result = await this.service.likeComment(
            frame.options.id,
            frame.options?.context?.member,
            frame.options
        );

        const comment = await this.service.getCommentByID(frame.options.id, frame.options);

        this.setCacheInvalidationHeaders(comment, frame);

        return result;
    }

    /**
     * @param {Frame} frame
     */
    async unlike(frame) {
        this.#checkMember(frame);

        const result = await this.service.unlikeComment(
            frame.options.id,
            frame.options?.context?.member,
            frame.options
        );

        const comment = await this.service.getCommentByID(frame.options.id, frame.options);

        this.setCacheInvalidationHeaders(comment, frame);

        return result;
    }

    /**
     * @param {Frame} frame
     */
    async report(frame) {
        this.#checkMember(frame);

        return await this.service.reportComment(
            frame.options.id,
            frame.options?.context?.member,
            frame.options
        );
    }

    /**
     * Get reporters for a specific comment (admin only)
     * @param {Frame} frame
     */
    async getCommentReporters(frame) {
        const commentId = frame.options.id;
        return await this.service.getCommentReporters(commentId, {
            page: frame.options.page,
            limit: frame.options.limit
        });
    }

    /**
     * Get likes for a specific comment (admin only)
     * @param {Frame} frame
     */
    async getCommentLikes(frame) {
        const commentId = frame.options.id;
        return await this.service.getCommentLikes(commentId, {
            page: frame.options.page,
            limit: frame.options.limit
        });
    }

    /**
     * @param {Frame} frame
     */
    async dislike(frame) {
        this.#checkMember(frame);

        const result = await this.service.dislikeComment(
            frame.options.id,
            frame.options?.context?.member,
            frame.options
        );

        const comment = await this.service.getCommentByID(frame.options.id, frame.options);

        this.setCacheInvalidationHeaders(comment, frame);

        return result;
    }

    /**
     * @param {Frame} frame
     */
    async undislike(frame) {
        this.#checkMember(frame);

        const result = await this.service.undislikeComment(
            frame.options.id,
            frame.options?.context?.member,
            frame.options
        );

        const comment = await this.service.getCommentByID(frame.options.id, frame.options);

        this.setCacheInvalidationHeaders(comment, frame);

        return result;
    }

    /**
     * Get dislikes for a specific comment (admin only)
     * @param {Frame} frame
     */
    async getCommentDislikes(frame) {
        const commentId = frame.options.id;
        return await this.service.getCommentDislikes(commentId, {
            page: frame.options.page,
            limit: frame.options.limit
        });
    }
};
