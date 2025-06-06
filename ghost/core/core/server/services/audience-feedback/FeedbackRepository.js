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

    async getForPost(postId, options = {}) {
        // Build filter string
        let filter = `post_id:'${postId}'`;
        if (options.score !== undefined) {
            filter += `+score:${options.score}`;
        }

        const findOptions = {
            limit: options.limit || 10,
            page: options.page || 1,
            order: 'created_at DESC',
            withRelated: ['member'],
            filter: filter
        };

        // Use findPage with filter
        const results = await this.#MemberFeedback.findPage(findOptions);
        
        return {
            data: results.data.map((model) => {
                const feedback = model.toJSON();
                return {
                    id: feedback.id,
                    score: feedback.score,
                    created_at: feedback.created_at,
                    member: feedback.member
                };
            }),
            meta: results.meta
        };
    }
};
