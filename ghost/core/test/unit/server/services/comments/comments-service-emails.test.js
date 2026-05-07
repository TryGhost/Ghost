const assert = require('node:assert/strict');
const sinon = require('sinon');
const CommentsServiceEmails = require('../../../../../core/server/services/comments/comments-service-emails');

describe('Comments Service: CommentsServiceEmails', function () {
    function createClassInstance({labs = {}}) {
        const urlService = {
            getUrlByResourceId: sinon.stub().returns('https://example.com/my-post/')
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

            const result = instance.getPostUrl('123', '456');

            assert.equal(result, 'https://example.com/my-post/#ghost-comments-456');
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

            // Stub `getUrlByResourceId` with a withArgs match: the URL only
            // resolves when the post's id is passed. Anything else returns
            // undefined, so a regression that drops `post.id` somewhere
            // between notifyX and the URL service surfaces as a bad URL
            // landing in templateData.
            const getUrlByResourceIdStub = sinon.stub().returns(undefined);
            getUrlByResourceIdStub.withArgs('post-id', sinon.match.any)
                .returns('https://example.com/my-post/');
            const urlService = {getUrlByResourceId: getUrlByResourceIdStub};

            const instance = new CommentsServiceEmails({
                config: {},
                logging: {warn: sinon.stub()},
                models: {Post, Member, User, Comment},
                mailer: {send: mailerSendStub},
                settingsCache: {get: sinon.stub().returns('Test Site')},
                settingsHelpers: {getMembersSupportAddress: () => 'support@example.com'},
                urlService,
                urlUtils: {
                    getSiteUrl: () => 'https://example.com/',
                    urlFor: () => 'https://example.com/ghost/',
                    urlJoin: (...parts) => parts.join('')
                },
                labs: {isSet: sinon.stub().returns(false)}
            });

            instance.commentsServiceEmailRenderer.renderEmailTemplate = renderStub;
            const getPostUrlSpy = sinon.spy(instance, 'getPostUrl');

            return {instance, post, comment, getPostUrlSpy, renderStub, urlService};
        }

        it('notifyPostAuthors: passes the right post arg into getPostUrl and threads the URL into templateData', async function () {
            const {instance, post, comment, getPostUrlSpy, renderStub, urlService} = buildHarness();

            await instance.notifyPostAuthors(comment);

            // The signature on `main` is (postId, commentId). When this test
            // was written the call site at line 51 passes the string id; the
            // upcoming HKG-1761 migration will rewrite it to pass the post
            // model. Either way, the URL must thread through to templateData.
            sinon.assert.calledOnce(getPostUrlSpy);
            const [postArg, commentIdArg] = getPostUrlSpy.firstCall.args;
            assert.equal(commentIdArg, 'comment-id');
            // postArg is either the post model or its id; both yield the same URL
            assert.equal(typeof postArg === 'string' ? postArg : postArg && postArg.id, post.id);

            // End-to-end pin: getUrlByResourceId must receive the post's id,
            // not whatever shape happens to render to a string. The stub
            // only returns the canonical URL for 'post-id', so a regression
            // that drops the id somewhere in the chain surfaces here.
            sinon.assert.calledWith(urlService.getUrlByResourceId, 'post-id');

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
            const {instance, post, comment, getPostUrlSpy, renderStub, urlService} = buildHarness();

            await instance.notifyReport(comment, {name: 'Reporter', email: 'reporter@example.com'});

            // The bug we want to catch: if the helper signature changes
            // (postId → post) but this notifyReport call site is not
            // migrated, getPostUrl is invoked with a string and produces
            // a malformed URL. Pin the URL here so a future regression
            // surfaces immediately.
            sinon.assert.calledOnce(getPostUrlSpy);
            const [postArg, commentIdArg] = getPostUrlSpy.firstCall.args;
            assert.equal(commentIdArg, 'comment-id');
            assert.equal(typeof postArg === 'string' ? postArg : postArg && postArg.id, post.id);

            sinon.assert.calledWith(urlService.getUrlByResourceId, 'post-id');

            sinon.assert.calledOnce(renderStub);
            const [, templateData] = renderStub.firstCall.args;
            assert.equal(templateData.postUrl, POST_URL_FOR_COMMENT);
        });
    });
});
