const _ = require('lodash');
const errors = require('@tryghost/errors');

/**
 * @typedef {import('../../api/shared/frame')} Frame
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
        return this.service.getComments(frame.options);
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
    async read(frame) {
        return await this.service.getCommentByID(frame.data.id, frame.options);
    }

    /**
     * @param {Frame} frame
     */
    async edit(frame) {
        this.#checkMember(frame);

        if (frame.data.comments[0].status === 'deleted') {
            return await this.service.deleteComment(
                frame.options.id,
                frame?.options?.context?.member?.id,
                frame.options
            );
        }

        return await this.service.editCommentContent(
            frame.options.id,
            frame?.options?.context?.member?.id,
            frame.data.comments[0].html,
            frame.options
        );
    }

    /**
     * @param {Frame} frame
     */
    async add(frame) {
        this.#checkMember(frame);
        const data = frame.data.comments[0];

        if (data.parent_id) {
            return await this.service.replyToComment(
                data.parent_id,
                frame.options.context.member.id,
                data.html,
                frame.options
            );
        }

        return await this.service.commentOnPost(
            data.post_id,
            frame.options.context.member.id,
            data.html,
            frame.options
        );
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

        return await this.service.likeComment(
            frame.options.id,
            frame.options?.context?.member,
            frame.options
        );
    }

    /**
     * @param {Frame} frame
     */
    async unlike(frame) {
        this.#checkMember(frame);

        return await this.service.unlikeComment(
            frame.options.id,
            frame.options?.context?.member,
            frame.options
        );
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
