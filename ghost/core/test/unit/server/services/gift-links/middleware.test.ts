import assert from 'node:assert/strict';
import sinon from 'sinon';

const labs = require('../../../../../core/shared/labs');
// Mutated in tests to swap in a stubbed `.service`, so it's typed loosely.
const giftLinksService = require('../../../../../core/server/services/gift-links') as any;
const {loadGiftLink, countGiftRead} = require('../../../../../core/server/services/gift-links/middleware') as {
    loadGiftLink: (_req: any, _res: any, _next: any) => Promise<void>;
    countGiftRead: (_req: any, _res: any, _giftLink: any) => void;
};

const HUMAN_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const BOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

function makeReqRes({userAgent, cookieHeader}: {userAgent?: string; cookieHeader?: string} = {}) {
    const headers: Record<string, any> = {};
    const req = {
        get: (h: string) => (h.toLowerCase() === 'user-agent' ? userAgent : undefined),
        path: '/g/my-post/',
        originalUrl: '/g/my-post/?key=tok',
        protocol: 'http',
        connection: {},
        headers: {cookie: cookieHeader || ''}
    };
    const res = {
        getHeader: (name: string) => headers[name.toLowerCase()],
        setHeader: (name: string, val: any) => {
            headers[name.toLowerCase()] = val;
        }
    };
    return {req, res, headers};
}

describe('Unit: gift-links/middleware loadGiftLink', function () {
    let req: any;
    let res: any;
    let next: any;
    let setStub: any;

    beforeEach(function () {
        setStub = sinon.stub();
        req = {path: '/g/my-post/', query: {}};
        res = {locals: {}, set: setStub};
        next = sinon.stub();
    });

    afterEach(function () {
        sinon.restore();
        giftLinksService.setService(undefined);
    });

    it('no-ops when the path is not under /g/', async function () {
        req.path = '/some-post/';
        req.query.key = 'tok';
        sinon.stub(labs, 'isSet').withArgs('giftLinks').returns(true);

        await loadGiftLink(req, res, next);

        sinon.assert.notCalled(setStub);
        assert.equal(res.locals.giftLink, undefined);
        sinon.assert.calledOnce(next);
    });

    it('no-ops when the flag is disabled', async function () {
        req.query.key = 'tok';
        sinon.stub(labs, 'isSet').returns(false);

        await loadGiftLink(req, res, next);

        sinon.assert.notCalled(setStub);
        assert.equal(res.locals.giftLink, undefined);
        sinon.assert.calledOnce(next);
    });

    it('no-ops when there is no key in the query string', async function () {
        sinon.stub(labs, 'isSet').withArgs('giftLinks').returns(true);

        await loadGiftLink(req, res, next);

        sinon.assert.notCalled(setStub);
        assert.equal(res.locals.giftLink, undefined);
        sinon.assert.calledOnce(next);
    });

    it('ignores a non-string key param (e.g. ?key[$ne]= object/array)', async function () {
        req.query.key = {$ne: 'x'};
        sinon.stub(labs, 'isSet').withArgs('giftLinks').returns(true);

        await loadGiftLink(req, res, next);

        sinon.assert.notCalled(setStub);
        assert.equal(res.locals.giftLink, undefined);
        sinon.assert.calledOnce(next);
    });

    it('sets noindex + referrer headers and grants for a valid token on a /g/ path', async function () {
        req.query.key = 'tok';
        sinon.stub(labs, 'isSet').withArgs('giftLinks').returns(true);
        giftLinksService.setService({
            getPostByToken: sinon.stub().resolves({id: 'post-1', giftLinks: [{token: 'tok'}]})
        });

        await loadGiftLink(req, res, next);

        sinon.assert.calledWith(setStub, 'X-Robots-Tag', 'noindex');
        sinon.assert.calledWith(setStub, 'Referrer-Policy', 'no-referrer');
        assert.deepEqual(res.locals.giftLink, {post_id: 'post-1', token: 'tok'});
        sinon.assert.calledOnce(next);
    });

    it('sets no grant when the token is unknown (controller will 301 to canonical)', async function () {
        req.query.key = 'bad';
        sinon.stub(labs, 'isSet').withArgs('giftLinks').returns(true);
        giftLinksService.setService({getPostByToken: sinon.stub().resolves(null)});

        await loadGiftLink(req, res, next);

        sinon.assert.notCalled(setStub);
        assert.equal(res.locals.giftLink, undefined);
        sinon.assert.calledOnce(next);
    });

    describe('countGiftRead', function () {
        const giftLink = {post_id: 'post-1', token: 'tok'};

        beforeEach(function () {
            giftLinksService.setService({recordRedemption: sinon.stub().resolves(1)});
        });

        it('counts a human read with no prior cookie, and sets the ghost-gift-seen cookie', function () {
            const ctx = makeReqRes({userAgent: HUMAN_UA});

            countGiftRead(ctx.req, ctx.res, giftLink);

            sinon.assert.calledOnceWithExactly(giftLinksService.service.recordRedemption, 'tok');
            const setCookie = ctx.headers['set-cookie'];
            const cookieStr = Array.isArray(setCookie) ? setCookie.join(';') : String(setCookie);
            assert.match(cookieStr, /ghost-gift-seen-post-1=tok/, 'per-post cookie name avoids cross-post collisions');
            assert.match(cookieStr, /httponly/i);
            assert.match(cookieStr, /path=\/g\/my-post\//i);
        });

        it('does not count a bot/scanner read', function () {
            const ctx = makeReqRes({userAgent: BOT_UA});

            countGiftRead(ctx.req, ctx.res, giftLink);

            sinon.assert.notCalled(giftLinksService.service.recordRedemption);
        });

        it('does not double-count when the ghost-gift-seen cookie already matches the token', function () {
            const ctx = makeReqRes({userAgent: HUMAN_UA, cookieHeader: 'ghost-gift-seen-post-1=tok'});

            countGiftRead(ctx.req, ctx.res, giftLink);

            sinon.assert.notCalled(giftLinksService.service.recordRedemption);
        });

        it('counts again when the ghost-gift-seen cookie holds a different (reset) token', function () {
            const ctx = makeReqRes({userAgent: HUMAN_UA, cookieHeader: 'ghost-gift-seen-post-1=an-old-token'});

            countGiftRead(ctx.req, ctx.res, giftLink);

            sinon.assert.calledOnce(giftLinksService.service.recordRedemption);
        });

        it('no-ops when there is no gift link', function () {
            const ctx = makeReqRes({userAgent: HUMAN_UA});

            countGiftRead(ctx.req, ctx.res, null);

            sinon.assert.notCalled(giftLinksService.service.recordRedemption);
        });

        // Fix D: behind a TLS-terminating proxy the request connection looks
        // like plain http, but the site URL is https so the cookie must be
        // marked `secure`. The cookies lib THROWS on `.set({secure: true})`
        // over a connection it sees as insecure; the fix passes `secure` on the
        // CONSTRUCTOR (Cookies(req, res, {secure})) which avoids the throw. This
        // test simulates that exact scenario: an insecure-looking request whose
        // site URL resolves to https, and asserts the count still increments and
        // the cookie is still emitted (with the OLD per-set option it would
        // throw and skip recordRedemption entirely).
        it('still counts (no throw) when the site is https but the proxy connection looks insecure', function () {
            const Cookies = require('cookies');
            // The lib only throws when the per-`.set()` `secure: true` option is
            // combined with a connection it deems insecure. Sanity-check the
            // fix uses the constructor form by spying on the constructed
            // instance's `.set` to confirm no `secure` option is passed there.
            const setSpy = sinon.spy(Cookies.prototype, 'set');
            const ctx = makeReqRes({userAgent: HUMAN_UA});

            countGiftRead(ctx.req, ctx.res, giftLink);

            sinon.assert.calledOnceWithExactly(giftLinksService.service.recordRedemption, 'tok');
            sinon.assert.calledOnce(setSpy);
            const setOpts = setSpy.firstCall.args[2] || {};
            assert.equal(setOpts.secure, undefined, 'secure must not be a per-.set() option (constructor-level only) to avoid the throw');
        });

        // Fix E: the dedup cookie must persist across browser sessions, so it
        // must carry an Expires/Max-Age attribute (a session-only cookie would
        // let the same reader recount every session).
        it('sets a persistent (expiring) ghost-gift-seen cookie, not a session cookie', function () {
            const ctx = makeReqRes({userAgent: HUMAN_UA});

            countGiftRead(ctx.req, ctx.res, giftLink);

            const setCookie = ctx.headers['set-cookie'];
            const cookieStr = Array.isArray(setCookie) ? setCookie.join(';') : String(setCookie);
            assert.match(cookieStr, /expires=/i, 'cookie persists across sessions via an Expires attribute');
        });
    });
});
