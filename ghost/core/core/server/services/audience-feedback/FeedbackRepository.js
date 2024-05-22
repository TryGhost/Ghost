module.exports = class FeedbackRepository {
    /** @type {object} */
    #Member;

    /** @type {object} */
    #Post;

    /** @type {object} */
    #MemberFeedback;

    /** @type {typeof Object} */
    #Feedback;

    /**
     * @param {object} deps
     * @param {object} deps.Member Bookshelf Model
     * @param {object} deps.Post Bookshelf Model
     * @param {object} deps.MemberFeedback Bookshelf Model
     * @param {object} deps.Feedback Feedback object
     */
    constructor(deps) {
        this.#Member = deps.Member;
        this.#Post = deps.Post;
        this.#MemberFeedback = deps.MemberFeedback;
        this.#Feedback = deps.Feedback;
    }

    async add(feedback) {
        await this.#MemberFeedback.add({
            id: feedback.id.toHexString(),
            member_id: feedback.memberId.toHexString(),
            post_id: feedback.postId.toHexString(),
            score: feedback.score
        });
    }

    async edit(feedback) {
        await this.#MemberFeedback.edit({
            score: feedback.score
        }, {
            id: feedback.id.toHexString()
        });
    }

    async get(postId, memberId) {
        const model = await this.#MemberFeedback.findOne({member_id: memberId, post_id: postId}, {require: false});

        if (!model) {
            return;
        }

        return new this.#Feedback({
            id: model.id,
            memberId: model.get('member_id'),
            postId: model.get('post_id'),
            score: model.get('score')
        });
    }

    async getMemberByUuid(uuid) {
        return await this.#Member.findOne({uuid});
    }

    async getPostById(id) {
        return await this.#Post.findOne({id, status: 'all'});
    }
};
