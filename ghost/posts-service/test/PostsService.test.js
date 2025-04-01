const {PostsService} = require('../index');
const assert = require('assert/strict');
const sinon = require('sinon');

function buildPostStub(attrs) {
    return {
        ...attrs,
        get(attr) {
            return attrs[attr];
        },
        toJSON() {
            return attrs;
        }
    };
}

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

    // Some properties on a post are virtual and not stored in the database but
    // are calculated based on other properties. We need to ensure these properties
    // are correctly calculated and returned when requested.
    //
    // Note that we need to use real Post instances here because we're dependant
    // on Post.toJSON behaviour.
    describe('virtual properties', function () {
        let postData = [];
        let postsService;

        beforeEach(function () {
            postData = [];

            postsService = new PostsService({
                models: {
                    Post: {
                        findPage: sinon.spy(async () => ({data: postData.map(buildPostStub)})),
                        findOne: sinon.spy(async () => (buildPostStub(postData[0])))
                    }
                }
            });
        });

        describe('excerpt', function () {
            it('adds excerpt when no explicit columns are requested', async function () {
                postData.push({id: '1', plaintext: new Array(5000).join('A')});
                const {posts} = await postsService.browsePosts({});
                assert.ok(Object.prototype.hasOwnProperty.call(posts[0], 'excerpt'));
            });

            it('adds excerpt when columns include excerpt', async function () {
                postData.push({id: '1', plaintext: new Array(5000).join('A')});
                const {posts} = await postsService.browsePosts({options: {columns: ['excerpt']}});
                assert.ok(Object.prototype.hasOwnProperty.call(posts[0], 'excerpt'));
            });

            it('does not add excerpt if columns does not include excerpt', async function () {
                postData.push({id: '1', plaintext: new Array(5000).join('A')});
                const {posts} = await postsService.browsePosts({options: {columns: ['id']}});
                assert.ok(!Object.prototype.hasOwnProperty.call(posts[0], 'excerpt'));
            });

            it('uses custom_excerpt for excerpt when it exists', async function () {
                postData.push({id: '1', plaintext: new Array(5000).join('A'), custom_excerpt: 'custom excerpt'});
                const {posts} = await postsService.browsePosts({});
                assert.equal(posts[0].excerpt, 'custom excerpt');
            });

            it('uses substring of plaintext when custom_excerpt does not exist', async function () {
                postData.push({id: '1', plaintext: new Array(5000).join('A')});
                const {posts} = await postsService.browsePosts({});
                assert.equal(posts[0].excerpt.length, 500);
                assert.equal(posts[0].excerpt, new Array(501).join('A'));
            });

            it('has a null excerpt when custom_excerpt and plaintext do not exist', async function () {
                postData.push({id: '1'});
                const {posts} = await postsService.browsePosts({});
                assert.equal(posts[0].excerpt, null);
            });

            // TODO: this feels wrong but matches old behaviour, would be better to always return null or maybe fall back to plaintext
            it('has an empty excerpt when custom_excerpt is empty', async function () {
                postData.push({id: '1', custom_excerpt: '', plaintext: new Array(5000).join('A')});
                const {posts} = await postsService.browsePosts({});
                assert.equal(posts[0].excerpt, '');
            });

            it('can still generate excerpt from custom_excerpt when only excerpt is requested', async function () {

            });

            it('can still generate excerpt from plaintext when only excerpt is requested');
        });

        describe('reading_time', function () {
            it('includes reading_time when no explicit columns are requested');
            it('includes reading_time when columns include reading_time');
            it('calculates reading_time based on html');
            it('can still calculate reading_time when html isn\'t requested');
        });
    });

    // Uses member from the frame context to determine which content of a post is visible,
    // anything not visible is stripped out/replaced with a paywall. Actual logic for attr
    // manipulation lives in the content-gating service so we only need to ensure it gets
    // called when we expect it to.
    describe('content gating', function () {
        let postData = [];
        let postsService;
        let contentGating;
        let labs;

        beforeEach(function () {
            postData = [];

            contentGating = {
                gatePostAttrs: sinon.stub()
            };

            labs = {
                isSet: sinon.stub().returns(false)
            };

            // @ts-ignore
            postsService = new PostsService({
                models: {
                    Post: {
                        findPage: sinon.spy(async () => ({data: postData.map(buildPostStub)})),
                        findOne: sinon.spy(async () => (buildPostStub(postData[0])))
                    }
                },
                contentGating,
                labs
            });
        });

        afterEach(function () {
            sinon.restore();
        });

        it('browsePosts() does not call gatePostAttrs for admin api requests', async function () {
            postData.push({id: '1', visibility: 'public'});
            postData.push({id: '2', visibility: 'members'});
            await postsService.browsePosts({apiType: 'admin'});

            sinon.assert.notCalled(contentGating.gatePostAttrs);
        });

        it('browsePosts() calls gatePostAttrs for each fetched post for content api requests', async function () {
            postData.push({id: '1', visibility: 'public'});
            postData.push({id: '2', visibility: 'members'});
            await postsService.browsePosts({apiType: 'content'});

            sinon.assert.calledTwice(contentGating.gatePostAttrs);
        });

        it('readPost() does not call gatePostAttrs for admin api requests', async function () {
            postData.push({id: '1', visibility: 'public'});
            await postsService.readPost({apiType: 'admin'});

            sinon.assert.notCalled(contentGating.gatePostAttrs);
        });

        it('readPost() calls gatePostAttrs for content api requests', async function () {
            postData.push({id: '1', visibility: 'public'});
            await postsService.readPost({apiType: 'content'});

            sinon.assert.calledOnce(contentGating.gatePostAttrs);
        });

        it('calls gatePostAttrs with addAccessAttr=true by default', async function () {
            const post = {id: 'post1', visibility: 'public'};
            const member = {id: 'member1', status: 'paid'};
            postData.push(post);

            const frame = {
                apiType: 'content',
                options: {context: {member}}
            };
            await postsService.readPost(frame);

            sinon.assert.calledWith(contentGating.gatePostAttrs, post, member, {addAccessAttr: true, labs});
        });

        it('calls gatePostAttrs with addAccessAttr=false when columns does not include access', async function () {
            const post = {id: 'post1', visibility: 'public'};
            const member = {id: 'member1', status: 'paid'};
            postData.push(post);

            const frame = {
                apiType: 'content',
                options: {
                    context: {member},
                    columns: ['id', 'html']
                }
            };
            await postsService.readPost(frame);

            sinon.assert.calledWith(contentGating.gatePostAttrs, post, member, {addAccessAttr: false, labs});
        });
    });
});
