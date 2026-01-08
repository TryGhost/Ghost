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
    memberNotFound: 'Unable to find member'
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

    async #setImpersonationContext(options) {
        if (options.impersonate_member_uuid) {
            options.context = options.context || {};
            options.context.member = options.context.member || {};
            options.context.member.id = await this.service.getMemberIdByUUID(options.impersonate_member_uuid);
        }
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
        if (frame.options.post_id) {
            if (frame.options.filter) {
                frame.options.mongoTransformer = function (query) {
                    return {
                        $and: [
                            {
                                post_id: frame.options.post_id
                            },
                            query
                        ]
                    };
                };
            } else {
                frame.options.filter = `post_id:${frame.options.post_id}`;
            }
        }

        return await this.service.getComments(frame.options);
    }

    async adminBrowse(frame) {
        if (frame.options.post_id) {
            if (frame.options.filter) {
                frame.options.mongoTransformer = function (query) {
                    return {
                        $and: [
                            {
                                post_id: frame.options.post_id
                            },
                            query
                        ]
                    };
                };
            } else {
                frame.options.filter = `post_id:${frame.options.post_id}`;
            }
        }

        frame.options.isAdmin = true;
        // Admin routes in Comments-UI lack member context due to cross-domain constraints (CORS), which prevents
        // credentials from being passed. This causes issues like the inability to determine if a
        // logged-in admin (acting on behalf of a member) has already liked a comment.
        // To resolve this, we retrieve the `impersonate_member_uuid` from the request params and
        // explicitly set it in the context options as the acting member's ID.
        // Note: This approach is applied to several admin routes where member context is required.
        await this.#setImpersonationContext(frame.options);
        return await this.service.getAdminComments(frame.options);
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
        frame.options.isAdmin = true;
        frame.options.order = 'created_at asc'; // we always want to load replies from oldest to newest
        await this.#setImpersonationContext(frame.options);

        return this.service.getReplies(frame.options.id, _.omit(frame.options, 'id'));
    }

    /**
     * @param {Frame} frame
     */
    async read(frame) {
        await this.#setImpersonationContext(frame.options);
        return await this.service.getCommentByID(frame.data.id, frame.options);
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

        if (result) {
            const postId = result.get('post_id');
            const parentId = result.get('parent_id');
            const pathsToInvalidate = [
                postId ? `/api/members/comments/post/${postId}/` : null,
                parentId ? `/api/members/comments/${parentId}/replies/` : null
            ].filter(path => path !== null);
            frame.setHeader('X-Cache-Invalidate', pathsToInvalidate.join(', '));
        }

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

        if (result) {
            const postId = result.get('post_id');
            const parentId = result.get('parent_id');
            const pathsToInvalidate = [
                postId ? `/api/members/comments/post/${postId}/` : null,
                parentId ? `/api/members/comments/${parentId}/replies/` : null
            ].filter(path => path !== null);
            frame.setHeader('X-Cache-Invalidate', pathsToInvalidate.join(', '));
        }

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

        const comment = await this.service.getCommentByID(frame.options.id);

        if (comment) {
            const postId = comment.get('post_id');
            const parentId = comment.get('parent_id');
            const pathsToInvalidate = [
                postId ? `/api/members/comments/post/${postId}/` : null,
                parentId ? `/api/members/comments/${parentId}/replies/` : null
            ].filter(path => path !== null);
            frame.setHeader('X-Cache-Invalidate', pathsToInvalidate.join(', '));
        }

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

        const comment = await this.service.getCommentByID(frame.options.id);

        if (comment) {
            const postId = comment.get('post_id');
            const parentId = comment.get('parent_id');
            const pathsToInvalidate = [
                postId ? `/api/members/comments/post/${postId}/` : null,
                parentId ? `/api/members/comments/${parentId}/replies/` : null
            ].filter(path => path !== null);
            frame.setHeader('X-Cache-Invalidate', pathsToInvalidate.join(', '));
        }

        return result;
    }

    /**
     * @param {Frame} frame
     */
    async report(frame) {
        this.#checkMember(frame);

        return await this.service.reportComment(
            frame.options.id,
            frame.options?.context?.member
        );
    }
};
