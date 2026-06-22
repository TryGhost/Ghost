import sinon from 'sinon';

const errors = require('@tryghost/errors');
const labs = require('../../../../../../core/shared/labs');
const urlUtils = require('../../../../../../core/shared/url-utils');
const proxy = require('../../../../../../core/frontend/services/proxy');
const renderer = require('../../../../../../core/frontend/services/rendering');
const giftLinksController = require('../../../../../../core/frontend/services/routing/controllers/gift-links') as (_req: any, _res: any, _next: any) => Promise<void>;

describe('Unit - services/routing/controllers/gift-links', function () {
    let req: any;
    let res: any;
    let next: any;
    let postsReadStub: any;
    let pagesReadStub: any;
    let getPostByTokenStub: any;
    let recordReadStub: any;
    let renderEntryInner: any;
    let handleErrorStub: any;

    beforeEach(function () {
        sinon.stub(labs, 'isSet').withArgs('giftLinks').returns(true);

        postsReadStub = sinon.stub().resolves({posts: []});
        pagesReadStub = sinon.stub().resolves({pages: []});
        sinon.stub(proxy, 'api').value({
            postsPublic: {read: postsReadStub},
            pagesPublic: {read: pagesReadStub}
        });

        getPostByTokenStub = sinon.stub().resolves(null);
        recordReadStub = sinon.spy();
        sinon.stub(proxy, 'giftLinks').value({
            service: {getPostByToken: getPostByTokenStub},
            recordRead: recordReadStub
        });

        // `synthesizePaidMember` is a lazy getter on the proxy; stub it to return
        // the synthesizing function.
        sinon.stub(proxy, 'synthesizePaidMember').get(() => async () => ({status: 'paid', products: []}));

        // `renderer.renderEntry` is a getter returning a curried
        // `renderEntry(req, res)(entry)`; stub the getter to capture the entry.
        renderEntryInner = sinon.spy();
        sinon.stub(renderer, 'renderEntry').get(() => () => renderEntryInner);

        // `renderer.handleError` getter returns a curried `handleError(next)(err)`.
        handleErrorStub = sinon.spy();
        sinon.stub(renderer, 'handleError').get(() => () => handleErrorStub);

        req = {
            params: {slug: 'my-post'},
            path: '/g/my-post/',
            query: {}
        };
        res = {
            locals: {},
            routerOptions: {},
            set: sinon.spy(),
            redirect: sinon.spy()
        };
        next = sinon.spy();
    });

    afterEach(function () {
        sinon.restore();
    });

    it('no-ops (next) when the giftLinks flag is off', async function () {
        labs.isSet.restore();
        sinon.stub(labs, 'isSet').withArgs('giftLinks').returns(false);

        await giftLinksController(req, res, next);

        sinon.assert.calledOnce(next);
        sinon.assert.notCalled(getPostByTokenStub);
    });

    describe('valid token', function () {
        beforeEach(function () {
            req.query.key = 'good-token';
            getPostByTokenStub.resolves({id: 'post-id-1', type: 'post'});
        });

        it('renders the unlocked entry with noindex/no-referrer when the slug matches', async function () {
            postsReadStub.resolves({posts: [{slug: 'my-post', url: 'https://example.com/my-post/'}]});

            await giftLinksController(req, res, next);

            // Single by-id read through the public posts API with a synthetic member.
            sinon.assert.calledOnce(postsReadStub);
            const readArg = postsReadStub.firstCall.args[0];
            sinon.assert.match(readArg.id, 'post-id-1');
            sinon.assert.match(readArg.context.member.status, 'paid');

            sinon.assert.calledWith(res.set, 'X-Robots-Tag', 'noindex');
            sinon.assert.calledWith(res.set, 'Referrer-Policy', 'no-referrer');
            // Read counted on the verified render path with the token + post id.
            sinon.assert.calledOnceWithExactly(recordReadStub, req, res, {token: 'good-token', postId: 'post-id-1'});
            sinon.assert.calledOnce(renderEntryInner);
            sinon.assert.notCalled(res.redirect);
            sinon.assert.notCalled(next);
        });

        it('canonicalises a stale slug to the current slug, keeping the key', async function () {
            req.params.slug = 'old-slug';
            postsReadStub.resolves({posts: [{slug: 'my-post', url: 'https://example.com/my-post/'}]});

            await giftLinksController(req, res, next);

            sinon.assert.calledWith(res.redirect, 301, '/g/my-post/?key=good-token');
            sinon.assert.notCalled(renderEntryInner);
            // A redirect is not a read — must not count.
            sinon.assert.notCalled(recordReadStub);
        });

        it('reads pages via pagesPublic when the token resolves to a page', async function () {
            getPostByTokenStub.resolves({id: 'page-id-1', type: 'page'});
            pagesReadStub.resolves({pages: [{slug: 'my-post', url: 'https://example.com/my-post/'}]});

            await giftLinksController(req, res, next);

            sinon.assert.calledOnce(pagesReadStub);
            sinon.assert.notCalled(postsReadStub);
            sinon.assert.calledOnce(renderEntryInner);
        });

        it('falls through to the canonical redirect when the post is gone (NotFound on read)', async function () {
            // Token resolves but the post was unpublished/deleted → by-id read
            // 404s. Fall back to resolving the URL slug; here it resolves to a
            // normal canonical URL, so redirect with the key dropped.
            postsReadStub.onFirstCall().rejects(new errors.NotFoundError({message: 'gone'}));
            postsReadStub.onSecondCall().resolves({posts: [{slug: 'my-post', url: 'https://example.com/my-post/'}]});

            await giftLinksController(req, res, next);

            sinon.assert.notCalled(renderEntryInner);
            sinon.assert.calledWith(res.redirect, 301, 'https://example.com/my-post/');
        });
    });

    describe('invalid / missing token (fallback path)', function () {
        it('redirects to the canonical URL when it is NOT under /g/', async function () {
            postsReadStub.resolves({posts: [{slug: 'my-post', url: 'https://example.com/my-post/'}]});

            await giftLinksController(req, res, next);

            sinon.assert.calledWith(res.redirect, 301, 'https://example.com/my-post/');
            sinon.assert.notCalled(next);
        });

        it('falls through to 404 instead of redirecting to a /g/ canonical URL (no self-redirect loop)', async function () {
            postsReadStub.resolves({posts: [{slug: 'my-post', url: 'https://example.com/g/my-post/'}]});

            await giftLinksController(req, res, next);

            sinon.assert.notCalled(res.redirect);
            sinon.assert.calledOnce(next);
        });

        it('falls through to 404 on a subdirectory install when the canonical URL is under /g/', async function () {
            // Regression: the loop guard must account for the configured
            // subdirectory. req.path is mount-relative ('/g/my-post/') but the
            // canonical pathname includes the subdir ('/blog/g/my-post/'); a
            // bare '/g/' prefix check would miss it and redirect into a loop.
            sinon.stub(urlUtils, 'getSubdir').returns('/blog');
            postsReadStub.resolves({posts: [{slug: 'my-post', url: 'https://example.com/blog/g/my-post/'}]});

            await giftLinksController(req, res, next);

            sinon.assert.notCalled(res.redirect);
            sinon.assert.calledOnce(next);
        });

        it('falls through to 404 when the canonical URL equals the current request path', async function () {
            postsReadStub.resolves({posts: [{slug: 'my-post', url: 'https://example.com/g/my-post/'}]});
            req.path = '/g/my-post/';

            await giftLinksController(req, res, next);

            sinon.assert.notCalled(res.redirect);
            sinon.assert.calledOnce(next);
        });

        it('falls through to 404 when the slug resolves to nothing', async function () {
            await giftLinksController(req, res, next);

            sinon.assert.notCalled(res.redirect);
            sinon.assert.calledOnce(next);
        });

        it('ignores a non-string key (array/object query value)', async function () {
            req.query.key = ['a', 'b'];

            await giftLinksController(req, res, next);

            sinon.assert.notCalled(getPostByTokenStub);
            sinon.assert.calledOnce(next);
        });

        it('re-throws a non-not-found error to the outer error handler instead of 301-to-canonical', async function () {
            const boom = new errors.InternalServerError({message: 'db timeout'});
            postsReadStub.rejects(boom);

            await giftLinksController(req, res, next);

            sinon.assert.notCalled(res.redirect);
            sinon.assert.calledOnceWithExactly(handleErrorStub, boom);
        });
    });
});
