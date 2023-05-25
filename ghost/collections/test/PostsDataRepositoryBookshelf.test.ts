import sinon from 'sinon';
import assert from 'assert';
import {PostsDataRepositoryBookshelf} from '../src/PostsDataRepositoryBookshelf';

describe('PostsDataRepositoryBookshelf', function () {
    let Post: any;

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
