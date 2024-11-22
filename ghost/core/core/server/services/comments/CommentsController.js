const _ = require('lodash');
const errors = require('@tryghost/errors');

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
     * @param {import('./CommentsService')} service
     * @param {import('./CommentsStatsService')} stats
     */
    constructor(service, stats) {
        this.service = service;
        this.stats = stats;
    }

    #checkMember(frame) {
        if (!frame.options?.context?.member?.id) {
            throw new errors.UnauthorizedError({
                message: tpl(messages.memberNotFound)
            });
        }
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
        return await this.service.getAdminComments(frame.options);
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
        return this.service.getReplies(frame.options.id, _.omit(frame.options, 'id'));
    }

    /**
     * @param {Frame} frame
     */
    async read(frame) {
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
