const Feedback = require('./Feedback');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const messages = {
    invalidScore: 'Invalid feedback score. Only 1 or 0 is currently allowed.',
    postNotFound: 'Post not found.',
    memberNotFound: 'Member not found.'
};

/**
 * @typedef {object} IFeedbackRepository
 * @prop {(feedback: Feedback) => Promise<void>} add
 * @prop {(feedback: Feedback) => Promise<void>} edit
 * @prop {(postId, memberId) => Promise<Feedback>} get
 * @prop {(id: string) => Promise<Post|undefined>} getPostById
 */

class AudienceFeedbackController {
    /** @type IFeedbackRepository */
    #repository;

    /**
     * @param {object} deps
     * @param {IFeedbackRepository} deps.repository
     */
    constructor(deps) {
        this.#repository = deps.repository;
    }

    /**
     * Get member from frame
     */
    #getMember(frame) {
        if (!frame.options?.context?.member?.id) {
            // This is an internal server error because authentication should happen outside this service.
            throw new errors.InternalServerError({
                message: tpl(messages.memberNotFound)
            });
        }
        return frame.options.context.member;
    }

    async add(frame) {
        const data = frame.data.feedback[0];
        const postId = data.post_id;
        const score = data.score;

        if (![0, 1].includes(score)) {
            throw new errors.ValidationError({
                message: tpl(messages.invalidScore)
            });
        }

        const member = this.#getMember(frame);

        const post = await this.#repository.getPostById(postId);
        if (!post) {
            throw new errors.NotFoundError({
                message: tpl(messages.postNotFound)
            });
        }

        const existing = await this.#repository.get(post.id, member.id);
        if (existing) {
            if (existing.score === score) {
                // Don't save so we don't update the updated_at timestamp
                return existing;
            }
            existing.score = score;
            await this.#repository.edit(existing);
            return existing;
        }

        const feedback = new Feedback({
            memberId: member.id, 
            postId: post.id, 
            score
        });
        await this.#repository.add(feedback);
        return feedback;
    }
}

module.exports = AudienceFeedbackController;
