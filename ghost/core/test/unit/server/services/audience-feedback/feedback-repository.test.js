const sinon = require('sinon');
const FeedbackRepository = require('../../../../../core/server/services/audience-feedback/feedback-repository');

describe('FeedbackRepository', function () {
    const postId = '634fc3901e0a291855d8b135';

    function createRepository(findPage) {
        return new FeedbackRepository({
            Member: {},
            Post: {},
            MemberFeedback: {findPage},
            Feedback: class Feedback {}
        });
    }

    it('loads the related member when requested', async function () {
        const findPage = sinon.stub().resolves({data: [], meta: {}});
        const repository = createRepository(findPage);

        await repository.getForPost(postId, {withMember: true});

        sinon.assert.calledOnceWithExactly(findPage, {
            limit: 10,
            page: 1,
            order: 'created_at DESC',
            filter: `post_id:'${postId}'`,
            withRelated: ['member']
        });
    });

    it('does not load the related member by default', async function () {
        const findPage = sinon.stub().resolves({data: [], meta: {}});
        const repository = createRepository(findPage);

        await repository.getForPost(postId);

        sinon.assert.calledOnceWithExactly(findPage, {
            limit: 10,
            page: 1,
            order: 'created_at DESC',
            filter: `post_id:'${postId}'`
        });
    });
});
