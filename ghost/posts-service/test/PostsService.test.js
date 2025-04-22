const {PostsService} = require('../index');
const assert = require('assert/strict');
const sinon = require('sinon');

describe('Posts Service', function () {
    it('Can construct class', function () {
        new PostsService({});
    });

    describe('shouldSendEmail', function () {
        it('calculates if an email should be sent', async function () {
            const postsService = new PostsService({});

            assert.deepEqual([
                postsService.shouldSendEmail('published', 'draft'),
                postsService.shouldSendEmail('published', 'scheduled'),
                postsService.shouldSendEmail('sent', 'draft'),
                postsService.shouldSendEmail('sent', 'scheduled'),

                postsService.shouldSendEmail('published', 'published'),
                postsService.shouldSendEmail('published', 'sent'),
                postsService.shouldSendEmail('published', 'published'),
                postsService.shouldSendEmail('published', 'sent'),
                postsService.shouldSendEmail('sent', 'published'),
                postsService.shouldSendEmail('sent', 'sent'),
                postsService.shouldSendEmail()
            ], [
                true,
                true,
                true,
                true,

                false,
                false,
                false,
                false,
                false,
                false,
                false
            ]);
        });
    });

    describe('copyPost', function () {
        const makeModelStub = (key, value) => ({
            get(k) {
                if (k === key) {
                    return value;
                }
            }
        });

        const POST_ID = 'abc123';

        let postModelStub, existingPostModel, frame;

        const makePostService = () => new PostsService({
            models: {
                Post: postModelStub
            }
        });

        beforeEach(function () {
            postModelStub = {
                add: sinon.stub(),
                findOne: sinon.stub()
            };

            existingPostModel = {
                attributes: {
                    id: POST_ID,
                    title: 'Test Post',
                    slug: 'test-post',
                    status: 'published',
                    newsletter_id: 'abc123'
                },
                related: sinon.stub()
            };

            frame = {
                options: {
                    id: POST_ID
                }
            };

            postModelStub.findOne.withArgs({
                id: POST_ID,
                status: 'all'
            }, frame.options).resolves(existingPostModel);

            postModelStub.add.resolves();

            existingPostModel.related.withArgs('authors').returns([]);
            existingPostModel.related.withArgs('tags').returns([]);
            existingPostModel.related.withArgs('posts_meta').returns({
                isNew: () => true
            });
            existingPostModel.related.withArgs('tiers').returns([]);
        });

        it('copies a post', async function () {
            const copiedPost = {
                attributes: {
                    id: 'def789'
                }
            };

            postModelStub.add.resolves(copiedPost);

            const result = await makePostService().copyPost(frame);

            // Ensure copied post is created
            assert.equal(
                postModelStub.add.calledOnceWithExactly(
                    sinon.match.object,
                    frame.options
                ),
                true
            );

            // Ensure copied post is returned
            assert.deepEqual(result, copiedPost);
        });

        it('omits unnecessary data from the copied post', async function () {
            await makePostService().copyPost(frame);

            const copiedPostData = postModelStub.add.getCall(0).args[0];

            assert.equal(copiedPostData.id, undefined);
            assert.equal(copiedPostData.slug, undefined);
        });

        it('updates the title of the copied post', async function () {
            await makePostService().copyPost(frame);

            const copiedPostData = postModelStub.add.getCall(0).args[0];

            assert.equal(copiedPostData.title, 'Test Post (Copy)');
        });

        it('updates the status of the copied post', async function () {
            await makePostService().copyPost(frame);

            const copiedPostData = postModelStub.add.getCall(0).args[0];

            assert.equal(copiedPostData.status, 'draft');
        });

        it('adds authors to the copied post', async function () {
            existingPostModel.related.withArgs('authors').returns([
                makeModelStub('id', 'author-1'),
                makeModelStub('id', 'author-2')
            ]);

            await makePostService().copyPost(frame);

            const copiedPostData = postModelStub.add.getCall(0).args[0];

            assert.deepEqual(copiedPostData.authors, [
                {id: 'author-1'},
                {id: 'author-2'}
            ]);
        });

        it('adds tags to the copied post', async function () {
            existingPostModel.related.withArgs('tags').returns([
                makeModelStub('id', 'tag-1'),
                makeModelStub('id', 'tag-2')
            ]);

            await makePostService().copyPost(frame);

            const copiedPostData = postModelStub.add.getCall(0).args[0];

            assert.deepEqual(copiedPostData.tags, [
                {id: 'tag-1'},
                {id: 'tag-2'}
            ]);
        });

        it('adds meta data to the copied post', async function () {
            const postMetaModel = {
                attributes: {
                    meta_title: 'Test Post',
                    meta_description: 'Test Post Description'
                },
                isNew: () => false
            };

            existingPostModel.related.withArgs('posts_meta').returns(postMetaModel);

            await makePostService().copyPost(frame);

            const copiedPostData = postModelStub.add.getCall(0).args[0];

            assert.deepEqual(copiedPostData.posts_meta, postMetaModel.attributes);
        });

        it('adds tiers to the copied post', async function () {
            existingPostModel.related.withArgs('tiers').returns([
                makeModelStub('id', 'tier-1'),
                makeModelStub('id', 'tier-2')
            ]);

            await makePostService().copyPost(frame);

            const copiedPostData = postModelStub.add.getCall(0).args[0];

            assert.deepEqual(copiedPostData.tiers, [
                {id: 'tier-1'},
                {id: 'tier-2'}
            ]);
        });

        it('omits unnecessary meta data from the copied post', async function () {
            const postMetaModel = {
                attributes: {
                    post_id: POST_ID,
                    meta_title: 'Test Post',
                    meta_description: 'Test Post Description',
                    email_only: 1,
                    email_subject: 'Test Email Subject'
                },
                isNew: () => false
            };

            existingPostModel.related.withArgs('posts_meta').returns(postMetaModel);

            await makePostService().copyPost(frame);

            const copiedPostData = postModelStub.add.getCall(0).args[0];

            assert.deepEqual(copiedPostData.posts_meta, {
                meta_title: postMetaModel.attributes.meta_title,
                meta_description: postMetaModel.attributes.meta_description
            });
        });
    });

    describe('generateCopiedPostLocationFromUrl', function () {
        it('generates a location from the provided url', function () {
            const postsService = new PostsService({});
            const url = 'http://foo.bar/ghost/api/admin/posts/abc123/copy/def456/';
            const expectedUrl = 'http://foo.bar/ghost/api/admin/posts/def456/';

            assert.equal(postsService.generateCopiedPostLocationFromUrl(url), expectedUrl);
        });
    });

    describe('handleCacheInvalidation', function () {
        let postsService;
        let urlUtils;

        beforeEach(function () {
            urlUtils = {
                urlFor: sinon.stub().returns('http://example.com/p/123/'),
                urlJoin: sinon.stub().returns('/p/123/')
            };
            postsService = new PostsService({urlUtils});
        });

        it('returns comma-separated URLs for draft posts that were changed', function () {
            const model = {
                get: sinon.stub().returns('draft'),
                previous: sinon.stub().returns('draft'),
                wasChanged: sinon.stub().returns(true),
                uuid: '123'
            };

            const result = postsService.handleCacheInvalidation(model);
            assert.deepEqual(result, {
                value: [
                    '/p/123/',
                    '/p/123/?member_status=anonymous',
                    '/p/123/?member_status=free',
                    '/p/123/?member_status=paid'
                ].join(', ')
            });
        });

        it('returns comma-separated URLs for scheduled posts that were changed', function () {
            const model = {
                get: sinon.stub().returns('scheduled'),
                wasChanged: sinon.stub().returns(true),
                uuid: '123'
            };

            const result = postsService.handleCacheInvalidation(model);
            assert.deepEqual(result, {
                value: [
                    '/p/123/',
                    '/p/123/?member_status=anonymous',
                    '/p/123/?member_status=free',
                    '/p/123/?member_status=paid'
                ].join(', ')
            });
        });
    });
});
