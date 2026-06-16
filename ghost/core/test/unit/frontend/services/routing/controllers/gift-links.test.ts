import sinon from 'sinon';

const errors = require('@tryghost/errors');
const labs = require('../../../../../../core/shared/labs');
const proxy = require('../../../../../../core/frontend/services/proxy');
const renderer = require('../../../../../../core/frontend/services/rendering');
const giftLinksController = require('../../../../../../core/frontend/services/routing/controllers/gift-links') as (_req: any, _res: any, _next: any) => Promise<void>;

describe('Unit - services/routing/controllers/gift-links', function () {
    let req: any;
    let res: any;
    let next: any;
    let postsReadStub: any;
    let pagesReadStub: any;
    let handleErrorStub: any;

    beforeEach(function () {
        sinon.stub(labs, 'isSet').withArgs('giftLinks').returns(true);

        postsReadStub = sinon.stub().resolves({posts: []});
        pagesReadStub = sinon.stub().resolves({pages: []});
        sinon.stub(proxy, 'api').value({
            postsPublic: {read: postsReadStub},
            pagesPublic: {read: pagesReadStub}
        });

        handleErrorStub = sinon.stub();
        // `renderer.handleError` is a getter that returns a curried
        // `handleError(next)(err)` function; stub the getter to return our spy.
        sinon.stub(renderer, 'handleError').get(() => () => handleErrorStub);

        req = {
            params: {slug: 'my-post'},
            path: '/g/my-post/'
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

    it('falls through to 404 instead of redirecting to a /g/ canonical URL (no self-redirect loop)', async function () {
        // No giftLink grant → fallback path. The slug resolves to an entry
        // whose canonical URL is itself under /g/ (collection permalinked
        // there), which would loop forever if we redirected to it.
        postsReadStub.resolves({posts: [{slug: 'my-post', url: 'https://example.com/g/my-post/'}]});

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

    it('redirects to the canonical URL when it is NOT under /g/', async function () {
        postsReadStub.resolves({posts: [{slug: 'my-post', url: 'https://example.com/my-post/'}]});

        await giftLinksController(req, res, next);

        sinon.assert.calledWith(res.redirect, 301, 'https://example.com/my-post/');
        sinon.assert.notCalled(next);
    });

    it('re-throws a non-not-found error (e.g. DB timeout) to the outer error handler instead of 301-to-paywall', async function () {
        const boom = new errors.InternalServerError({message: 'db timeout'});
        postsReadStub.rejects(boom);

        await giftLinksController(req, res, next);

        // Surfaced as a real error, NOT swallowed into a redirect/404.
        sinon.assert.notCalled(res.redirect);
        sinon.assert.calledOnceWithExactly(handleErrorStub, boom);
    });

    it('treats a genuine NotFoundError as "no entry" and falls through to 404', async function () {
        postsReadStub.rejects(new errors.NotFoundError({message: 'nope'}));
        pagesReadStub.rejects(new errors.NotFoundError({message: 'nope'}));

        await giftLinksController(req, res, next);

        sinon.assert.notCalled(res.redirect);
        sinon.assert.notCalled(handleErrorStub);
        sinon.assert.calledOnce(next);
    });
});
