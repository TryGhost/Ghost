const sinon = require('sinon');
const assert = require('assert/strict');
const {PostsDataRepositoryBookshelf} = require('../../../../../core/server/services/collections/PostsDataRepositoryBookshelf');

describe('PostsDataRepositoryBookshelf', function () {
    let Post;

    beforeEach(async function () {
        Post = {
            fetchAll: sinon.stub().resolves([])
        };
    });

    it('Can fetch posts by ids', async function () {
        const repository = new PostsDataRepositoryBookshelf({
            Post: Post
        });

        await repository.getBulk(['1', '2']);

        assert.ok(Post.fetchAll.calledOnce);
    });
});
