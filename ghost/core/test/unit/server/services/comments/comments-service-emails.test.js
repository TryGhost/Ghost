const assert = require('node:assert/strict');
const sinon = require('sinon');
const CommentsServiceEmails = require('../../../../../core/server/services/comments/comments-service-emails');

describe('Comments Service: CommentsServiceEmails', function () {
    function createClassInstance({labs = {}}) {
        const urlService = {
            facade: {
                getUrlForResource: sinon.stub().returns('https://example.com/my-post/')
            }
        };
        const labsStub = {
            isSet: sinon.stub().callsFake(flag => labs[flag] || false)
        };

        const instance = new CommentsServiceEmails({
            config: {},
            logging: {},
            models: {},
            mailer: {},
            settingsCache: {get: sinon.stub()},
            settingsHelpers: {},
            urlService,
            urlUtils: {},
            labs: labsStub
        });

        return {instance, urlService};
    }

    describe('getPostUrl', function () {
        it('returns post URL with comment permalink', function () {
            const {instance} = createClassInstance({});

            const result = instance.getPostUrl({id: '123'}, '456');

            assert.equal(result, 'https://example.com/my-post/#ghost-comments-456');
        });

        it('passes a posts resource to the facade', function () {
            const {instance, urlService} = createClassInstance({});

            instance.getPostUrl({id: '123'}, '456');

            sinon.assert.calledWith(
                urlService.facade.getUrlForResource,
                sinon.match({id: '123', type: 'posts'}),
                {absolute: true}
            );
        });

        it('serialises Bookshelf-model input so spread does not lose the id', function () {
            // Real callers (notify*Authors / notifyParentCommentAuthor / notifyReport)
            // pass a Bookshelf model from Post.findOne. Spreading one with
            // `{...model}` skips prototype getters like `.id`.
            const {instance, urlService} = createClassInstance({});
            const fakeBookshelfModel = {
                toJSON: () => ({id: '123', slug: 'my-post'})
            };

            instance.getPostUrl(fakeBookshelfModel, '456');

            sinon.assert.calledWith(
                urlService.facade.getUrlForResource,
                sinon.match({id: '123', slug: 'my-post', type: 'posts'}),
                {absolute: true}
            );
        });
    });

    // Characterisation tests for the three notification entry points. These
    // exercise the full public path so that future changes to `getPostUrl`'s
    // signature have to migrate every call site coherently — historically
    // line 161 of comments-service-emails.js was missed when the helper was
    // refactored, and the helper-only test above did not catch it.
    describe('public notification methods invoke getPostUrl', function () {
        const POST_URL_FOR_COMMENT = 'https://example.com/my-post/#ghost-comments-comment-id';

        function makeModel(attrs, related = {}) {
            return {
                id: attrs.id,
                attributes: attrs,
                get: key => attrs[key],
                related: name => related[name]
            };
        }

        function makeAuthor(attrs) {
            return makeModel(Object.assign({comment_notifications: true}, attrs));
        }

        function buildHarness(opts = {}) {
            const post = makeModel(
                Object.assign({id: 'post-id', title: 'My Post'}, opts.post),
                {
                    authors: opts.authors !== undefined ? opts.authors : [
                        makeAuthor({email: 'author@example.com', slug: 'author'})
                    ]
                }
            );
            const member = makeModel({
                id: 'member-id',
                name: 'Reader',
                email: 'reader@example.com',
                expertise: ''
            });
            const owner = makeModel({email: 'owner@example.com', slug: 'owner'});
            const comment = makeModel({
                id: 'comment-id',
                post_id: 'post-id',
                member_id: 'member-id',
                html: '<p>hi</p>',
                created_at: new Date('2026-04-01T00:00:00Z')
            });

            const Post = {findOne: sinon.stub().resolves(post)};
            const Member = {findOne: sinon.stub().resolves(member)};
            const User = {getOwnerUser: sinon.stub().resolves(owner)};
            const Comment = {findOne: sinon.stub()};

            const renderStub = sinon.stub().resolves({html: 'h', text: 't'});
            const mailerSendStub = sinon.stub().resolves();

            const instance = new CommentsServiceEmails({
                config: {},
                logging: {warn: sinon.stub()},
                models: {Post, Member, User, Comment},
                mailer: {send: mailerSendStub},
                settingsCache: {get: sinon.stub().returns('Test Site')},
                settingsHelpers: {getMembersSupportAddress: () => 'support@example.com'},
                urlService: {
                    facade: {
                        getUrlForResource: sinon.stub().returns('https://example.com/my-post/')
                    }
                },
                urlUtils: {
                    getSiteUrl: () => 'https://example.com/',
                    urlFor: () => 'https://example.com/ghost/',
                    urlJoin: (...parts) => parts.join('')
                },
                labs: {isSet: sinon.stub().returns(false)}
            });

            instance.commentsServiceEmailRenderer.renderEmailTemplate = renderStub;
            const getPostUrlSpy = sinon.spy(instance, 'getPostUrl');

            return {instance, post, comment, getPostUrlSpy, renderStub};
        }

        it('notifyPostAuthors: passes the right post arg into getPostUrl and threads the URL into templateData', async function () {
            const {instance, post, comment, getPostUrlSpy, renderStub} = buildHarness();

            await instance.notifyPostAuthors(comment);

            // The signature on `main` is (postId, commentId). When this test
            // was written the call site at line 51 passes the string id; the
            // upcoming HKG-1761 migration will rewrite it to pass the post
            // model. Either way, the URL must thread through to templateData.
            sinon.assert.calledOnce(getPostUrlSpy);
            const [postArg, commentIdArg] = getPostUrlSpy.firstCall.args;
            assert.equal(commentIdArg, 'comment-id');
            assert.equal(postArg.id, post.id);
            // After this commit's migration the call always passes a model.
            assert.notEqual(typeof postArg, 'string');

            sinon.assert.calledOnce(renderStub);
            const [, templateData] = renderStub.firstCall.args;
            assert.equal(templateData.postUrl, POST_URL_FOR_COMMENT);
        });

        // notifyParentCommentAuthor is intentionally not exercised here: the
        // function reaches into emailService.renderer.createUnsubscribeUrl,
        // which is only populated after the email-service module is
        // initialised, requiring far more setup than the regression scope
        // justifies. notifyPostAuthors above and notifyReport below cover
        // the same `getPostUrl` call-shape contract.

        it('notifyReport: threads the post URL through to templateData (regression for the missed line-161 migration)', async function () {
            const {instance, post, comment, getPostUrlSpy, renderStub} = buildHarness();

            await instance.notifyReport(comment, {name: 'Reporter', email: 'reporter@example.com'});

            // The bug we want to catch: if the helper signature changes
            // (postId → post) but this notifyReport call site is not
            // migrated, getPostUrl is invoked with a string and produces
            // a malformed URL. Pin the URL here so a future regression
            // surfaces immediately.
            sinon.assert.calledOnce(getPostUrlSpy);
            const [postArg, commentIdArg] = getPostUrlSpy.firstCall.args;
            assert.equal(commentIdArg, 'comment-id');
            assert.equal(postArg.id, post.id);
            // After this commit's migration the call always passes a model.
            assert.notEqual(typeof postArg, 'string');

            sinon.assert.calledOnce(renderStub);
            const [, templateData] = renderStub.firstCall.args;
            assert.equal(templateData.postUrl, POST_URL_FOR_COMMENT);
        });
    });
});
