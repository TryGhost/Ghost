/**
 * @typedef {import('../../api/shared/frame')} Frame
 */

const {MethodNotAllowedError} = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const messages = {
    cannotDestroyComments: 'You cannot destroy comments.'
};

module.exports = class CommentsController {
    /**
     * @param {import('./service')} service
     */
    constructor(service) {
        this.service = service;
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
    async read(frame) {
        return await this.service.getCommentByID(frame.data.id, frame.options);
    }

    /**
     * @param {Frame} frame
     */
    async edit(frame) {
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
};
