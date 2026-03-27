const PostsService = require('../../../../../core/server/services/posts/posts-service');
const assert = require('node:assert/strict');
const db = require('../../../../../core/server/data/db');
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
                    edit: sinon.stub(),
                    generateId: sinon.stub().returns('meta-id')
                },
                User: {
                    findOne: sinon.stub()
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
                    if (key === 'id') {
                        return 'post-123';
                    }
                    if (key === 'type') {
                        return 'post';
                    }
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

        it('refreshes the editing lease on save when there is no active editor', async function () {
            const now = new Date(Date.now() - (3 * 60 * 1000));
            const postData = {id: 'post-123', title: 'Test Post'};
            const model = {
                get: sinon.stub().callsFake((key) => {
                    if (key === 'id') {
                        return 'post-123';
                    }
                    if (key === 'type') {
                        return 'post';
                    }
                    if (key === 'status') {
                        return 'draft';
                    }
                    return null;
                }),
                previous: sinon.stub().returns('draft'),
                toJSON: sinon.stub().returns(postData),
                wasChanged: sinon.stub().returns(true)
            };
            const postsMeta = {
                get(key) {
                    if (key === 'editing_by') {
                        return 'old-user';
                    }
                    if (key === 'editing_name') {
                        return 'Old User';
                    }
                    if (key === 'editing_avatar') {
                        return '/content/images/old.png';
                    }
                    if (key === 'editing_session_id') {
                        return 'old-session';
                    }
                    if (key === 'editing_heartbeat_at') {
                        return now;
                    }
                    return null;
                }
            };
            const savedPost = {
                id: 'post-123',
                related: sinon.stub().withArgs('posts_meta').returns(postsMeta)
            };
            const user = {
                get: sinon.stub().callsFake((key) => {
                    if (key === 'id') {
                        return 'user-1';
                    }
                    if (key === 'name') {
                        return 'New User';
                    }
                    if (key === 'profile_image') {
                        return '/content/images/new.png';
                    }
                    return null;
                })
            };
            const queryBuilder = {
                insert: sinon.stub().returnsThis(),
                onConflict: sinon.stub().returnsThis(),
                merge: sinon.stub().resolves()
            };
            const fakeKnex = sinon.stub().returns(queryBuilder);

            mockModels.Post.edit.resolves(model);
            mockModels.Post.findOne.resolves(savedPost);
            mockModels.User.findOne.resolves(user);
            sinon.stub(db, 'knex').get(() => fakeKnex);

            const frame = {
                data: {posts: [{status: 'draft'}]},
                options: {
                    id: 'post-123',
                    context: {
                        user: 'user-1'
                    }
                }
            };

            await postsService.editPost(frame);

            sinon.assert.calledOnceWithExactly(mockModels.Post.findOne, {
                id: 'post-123',
                type: 'post',
                status: 'all'
            }, {
                context: frame.options.context,
                withRelated: ['posts_meta'],
                require: false
            });
            sinon.assert.calledOnceWithExactly(mockModels.User.findOne, {id: 'user-1'}, {require: false});
            sinon.assert.calledOnceWithExactly(fakeKnex, 'posts_meta');
            sinon.assert.calledOnce(queryBuilder.insert);
            assert.equal(queryBuilder.insert.firstCall.args[0].id, 'meta-id');
            assert.equal(queryBuilder.insert.firstCall.args[0].post_id, 'post-123');
            assert.equal(queryBuilder.insert.firstCall.args[0].editing_by, 'user-1');
            assert.equal(queryBuilder.insert.firstCall.args[0].editing_name, 'New User');
            assert.equal(queryBuilder.insert.firstCall.args[0].editing_avatar, '/content/images/new.png');
            assert.equal(queryBuilder.insert.firstCall.args[0].editing_session_id, null);
            assert.ok(queryBuilder.insert.firstCall.args[0].editing_heartbeat_at instanceof Date);
            sinon.assert.calledOnceWithExactly(queryBuilder.onConflict, 'post_id');
            sinon.assert.calledOnce(queryBuilder.merge);
            assert.equal(queryBuilder.merge.firstCall.args[0].editing_by, 'user-1');
            assert.equal(queryBuilder.merge.firstCall.args[0].editing_name, 'New User');
            assert.equal(queryBuilder.merge.firstCall.args[0].editing_avatar, '/content/images/new.png');
            assert.equal(queryBuilder.merge.firstCall.args[0].editing_session_id, null);
            assert.ok(queryBuilder.merge.firstCall.args[0].editing_heartbeat_at instanceof Date);
        });

        it('does not steal the editing lease from another active editor on save', async function () {
            const postData = {id: 'post-123', title: 'Test Post'};
            const model = {
                get: sinon.stub().callsFake((key) => {
                    if (key === 'id') {
                        return 'post-123';
                    }
                    if (key === 'type') {
                        return 'post';
                    }
                    if (key === 'status') {
                        return 'draft';
                    }
                    return null;
                }),
                previous: sinon.stub().returns('draft'),
                toJSON: sinon.stub().returns(postData),
                wasChanged: sinon.stub().returns(true)
            };
            const postsMeta = {
                get(key) {
                    if (key === 'editing_by') {
                        return 'user-2';
                    }
                    if (key === 'editing_name') {
                        return 'Other User';
                    }
                    if (key === 'editing_avatar') {
                        return '/content/images/other.png';
                    }
                    if (key === 'editing_session_id') {
                        return 'other-session';
                    }
                    if (key === 'editing_heartbeat_at') {
                        return new Date();
                    }
                    return null;
                }
            };
            const savedPost = {
                id: 'post-123',
                related: sinon.stub().withArgs('posts_meta').returns(postsMeta)
            };
            const user = {
                get: sinon.stub().callsFake((key) => {
                    if (key === 'id') {
                        return 'user-1';
                    }
                    if (key === 'name') {
                        return 'New User';
                    }
                    if (key === 'profile_image') {
                        return '/content/images/new.png';
                    }
                    return null;
                })
            };
            const queryBuilder = {
                insert: sinon.stub().returnsThis(),
                onConflict: sinon.stub().returnsThis(),
                merge: sinon.stub().resolves()
            };
            const fakeKnex = sinon.stub().returns(queryBuilder);

            mockModels.Post.edit.resolves(model);
            mockModels.Post.findOne.resolves(savedPost);
            mockModels.User.findOne.resolves(user);
            sinon.stub(db, 'knex').get(() => fakeKnex);

            const frame = {
                data: {posts: [{status: 'draft'}]},
                options: {
                    id: 'post-123',
                    context: {
                        user: 'user-1'
                    }
                }
            };

            await postsService.editPost(frame);

            sinon.assert.notCalled(fakeKnex);
            sinon.assert.notCalled(queryBuilder.insert);
            sinon.assert.notCalled(queryBuilder.onConflict);
            sinon.assert.notCalled(queryBuilder.merge);
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
