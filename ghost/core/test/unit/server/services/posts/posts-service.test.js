const PostsService = require('../../../../../core/server/services/posts/posts-service');
const assert = require('node:assert/strict');
const sinon = require('sinon');

describe('Posts Service', function () {
    it('Can construct class', function () {
        new PostsService({});
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
            sinon.assert.calledOnceWithExactly(postModelStub.add, sinon.match.object, frame.options);

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

    describe('editPost', function () {
        let postsService;
        let mockModels;
        let mockEmailService;
        let postEmailHandlerStub;

        beforeEach(function () {
            mockModels = {
                Post: {
                    findOne: sinon.stub(),
                    edit: sinon.stub()
                },
                Member: {
                    findPage: sinon.stub()
                },
                Newsletter: {
                    findOne: sinon.stub()
                }
            };

            mockEmailService = {
                checkCanSendEmail: sinon.stub().resolves(),
                createEmail: sinon.stub(),
                retryEmail: sinon.stub()
            };

            postsService = new PostsService({
                models: mockModels,
                emailService: mockEmailService
            });

            // Stub the postEmailHandler methods
            postEmailHandlerStub = {
                validateBeforeSave: sinon.stub().resolves(),
                createOrRetryEmail: sinon.stub().resolves()
            };

            postsService.postEmailHandler = postEmailHandlerStub;
        });

        afterEach(function () {
            sinon.restore();
        });

        it('calls postEmailHandler.validateBeforeSave', async function () {
            const model = {
                get: sinon.stub().returns(null),
                toJSON: sinon.stub().returns({id: 'post-123'}),
                wasChanged: sinon.stub().returns(false)
            };
            mockModels.Post.edit.resolves(model);

            const frame = {
                data: {posts: [{status: 'draft'}]},
                options: {id: 'post-123'}
            };

            await postsService.editPost(frame);

            sinon.assert.calledOnceWithExactly(postEmailHandlerStub.validateBeforeSave, frame);
        });

        it('propagates validation errors from validateBeforeSave', async function () {
            const validationError = new Error('Email limit exceeded');
            postEmailHandlerStub.validateBeforeSave.rejects(validationError);

            const frame = {
                data: {posts: [{status: 'published'}]},
                options: {id: 'post-123', newsletter: 'default'}
            };

            await assert.rejects(
                postsService.editPost(frame),
                (err) => {
                    assert.equal(err.message, 'Email limit exceeded');
                    return true;
                }
            );

            sinon.assert.notCalled(mockModels.Post.edit);
        });

        it('calls createOrRetryEmail after editing post', async function () {
            const model = {
                toJSON: sinon.stub().returns({id: 'post-123'})
            };
            mockModels.Post.edit.resolves(model);

            const frame = {
                data: {posts: [{status: 'published'}]},
                options: {id: 'post-123'}
            };

            await postsService.editPost(frame);

            sinon.assert.calledOnceWithExactly(postEmailHandlerStub.createOrRetryEmail, model);
        });

        it('returns post JSON and calls eventHandler', async function () {
            const postData = {id: 'post-123', title: 'Test Post'};
            const model = {
                get: sinon.stub().callsFake((key) => {
                    if (key === 'newsletter_id') {
                        return null;
                    }
                    if (key === 'status') {
                        return 'published';
                    }
                }),
                previous: sinon.stub().withArgs('status').returns('draft'),
                toJSON: sinon.stub().returns(postData),
                wasChanged: sinon.stub().returns(true)
            };
            mockModels.Post.edit.resolves(model);

            const frame = {
                data: {posts: [{status: 'published'}]},
                options: {id: 'post-123'}
            };

            const eventHandler = sinon.stub();
            const result = await postsService.editPost(frame, {eventHandler});

            assert.deepEqual(result, postData);
            sinon.assert.calledOnceWithExactly(eventHandler, 'published_updated', postData);
        });
    });

    describe('addPost', function () {
        let postsService;
        let mockModels;
        let mockEmailService;
        let postEmailHandlerStub;
        let mockPostModel;

        function createMockPostModel({status = 'draft', newsletterId = null} = {}) {
            const get = sinon.stub();
            get.withArgs('status').returns(status);
            get.withArgs('newsletter_id').returns(newsletterId);
            return {
                get,
                set: sinon.stub(),
                toJSON: sinon.stub().returns({id: 'post-123'})
            };
        }

        beforeEach(function () {
            mockPostModel = createMockPostModel();

            mockModels = {
                Post: {
                    findOne: sinon.stub(),
                    add: sinon.stub().resolves(mockPostModel)
                },
                Member: {
                    findPage: sinon.stub()
                },
                Newsletter: {
                    findOne: sinon.stub()
                }
            };

            mockEmailService = {
                checkCanSendEmail: sinon.stub().resolves(),
                createEmail: sinon.stub().resolves({id: 'email-123'}),
                retryEmail: sinon.stub()
            };

            postsService = new PostsService({
                models: mockModels,
                emailService: mockEmailService
            });

            postEmailHandlerStub = {
                validateBeforeSave: sinon.stub().resolves(),
                createOrRetryEmail: sinon.stub().resolves()
            };

            postsService.postEmailHandler = postEmailHandlerStub;
        });

        afterEach(function () {
            sinon.restore();
        });

        it('calls postEmailHandler.validateBeforeSave', async function () {
            const frame = {
                options: {newsletter: 'test-newsletter'},
                data: {posts: [{title: 'Test', status: 'published'}]}
            };

            await postsService.addPost(frame);

            sinon.assert.calledOnceWithExactly(postEmailHandlerStub.validateBeforeSave, frame);
        });

        it('propagates validation errors from validateBeforeSave', async function () {
            postEmailHandlerStub.validateBeforeSave.rejects(new Error('Validation failed'));

            const frame = {
                options: {newsletter: 'test-newsletter'},
                data: {posts: [{title: 'Test', status: 'published'}]}
            };

            await assert.rejects(
                postsService.addPost(frame),
                (err) => {
                    assert.equal(err.message, 'Validation failed');
                    return true;
                }
            );

            sinon.assert.notCalled(mockModels.Post.add);
        });

        it('creates email when post is published with newsletter', async function () {
            mockPostModel = createMockPostModel({status: 'published', newsletterId: 'newsletter-123'});
            mockModels.Post.add.resolves(mockPostModel);

            const frame = {
                options: {newsletter: 'test-newsletter'},
                data: {posts: [{title: 'Test', status: 'published'}]}
            };

            await postsService.addPost(frame);

            sinon.assert.calledOnceWithExactly(mockEmailService.createEmail, mockPostModel);
            sinon.assert.calledOnce(mockPostModel.set);
        });

        it('creates email when post status is sent (email-only)', async function () {
            mockPostModel = createMockPostModel({status: 'sent', newsletterId: 'newsletter-123'});
            mockModels.Post.add.resolves(mockPostModel);

            const frame = {
                options: {newsletter: 'test-newsletter'},
                data: {posts: [{title: 'Test', status: 'published'}]}
            };

            await postsService.addPost(frame);

            sinon.assert.calledOnceWithExactly(mockEmailService.createEmail, mockPostModel);
        });

        it('does not create email for draft posts', async function () {
            mockPostModel = createMockPostModel({status: 'draft'});
            mockModels.Post.add.resolves(mockPostModel);

            const frame = {
                options: {},
                data: {posts: [{title: 'Test', status: 'draft'}]}
            };

            await postsService.addPost(frame);

            sinon.assert.notCalled(mockEmailService.createEmail);
        });

        it('does not create email when no newsletter_id', async function () {
            mockPostModel = createMockPostModel({status: 'published', newsletterId: null});
            mockModels.Post.add.resolves(mockPostModel);

            const frame = {
                options: {},
                data: {posts: [{title: 'Test', status: 'published'}]}
            };

            await postsService.addPost(frame);

            sinon.assert.notCalled(mockEmailService.createEmail);
        });

        it('returns the model', async function () {
            const frame = {
                options: {},
                data: {posts: [{title: 'Test', status: 'draft'}]}
            };

            const result = await postsService.addPost(frame);

            assert.equal(result, mockPostModel);
        });
    });

    describe('getChanges', function () {
        let postsService;

        beforeEach(function () {
            postsService = new PostsService({});
        });

        it('returns correct change type for status transitions', function () {
            const testCases = [
                // [currentStatus, previousStatus, expected]
                ['published', 'draft', 'published_updated'],
                ['draft', 'published', 'unpublished'],
                ['draft', 'draft', 'draft_updated'],
                ['scheduled', 'draft', 'scheduled_updated']
            ];

            for (const [currentStatus, previousStatus, expected] of testCases) {
                const model = {
                    get: sinon.stub().withArgs('status').returns(currentStatus),
                    previous: sinon.stub().withArgs('status').returns(previousStatus),
                    wasChanged: sinon.stub().returns(true)
                };

                assert.equal(
                    postsService.getChanges(model),
                    expected,
                    `getChanges with status ${currentStatus} (prev: ${previousStatus}) should be ${expected}`
                );
            }
        });
    });
});
