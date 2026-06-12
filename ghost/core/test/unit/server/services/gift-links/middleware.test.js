const assert = require('node:assert/strict');
const sinon = require('sinon');
const labs = require('../../../../../core/shared/labs');
const giftLinksService = require('../../../../../core/server/services/gift-links');
const {loadGiftLink, countGiftRead} = require('../../../../../core/server/services/gift-links/middleware');

const HUMAN_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const BOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

function makeReqRes({userAgent, cookieHeader} = {}) {
    const headers = {};
    const req = {
        get: h => (h.toLowerCase() === 'user-agent' ? userAgent : undefined),
        path: '/g/my-post/',
        originalUrl: '/g/my-post/?key=tok',
        protocol: 'http',
        connection: {},
        headers: {cookie: cookieHeader || ''}
    };
    const res = {
        getHeader: name => headers[name.toLowerCase()],
        setHeader: (name, val) => {
            headers[name.toLowerCase()] = val;
        }
    };
    return {req, res, headers};
}

describe('Unit: gift-links/middleware loadGiftLink', function () {
    let req;
    let res;
    let next;
    let setStub;

    beforeEach(function () {
        setStub = sinon.stub();
        req = {path: '/g/my-post/', query: {}};
        res = {locals: {}, set: setStub};
        next = sinon.stub();
    });

    afterEach(function () {
        sinon.restore();
        delete giftLinksService.api;
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
        giftLinksService.api = {
            getActiveByToken: sinon.stub().resolves({id: 'gl1', get: () => 'post-1'})
        };

        await loadGiftLink(req, res, next);

        sinon.assert.calledWith(setStub, 'X-Robots-Tag', 'noindex');
        sinon.assert.calledWith(setStub, 'Referrer-Policy', 'no-referrer');
        assert.deepEqual(res.locals.giftLink, {id: 'gl1', post_id: 'post-1', token: 'tok'});
        sinon.assert.calledOnce(next);
    });

    it('sets no grant when the token is unknown (controller will 301 to canonical)', async function () {
        req.query.key = 'bad';
        sinon.stub(labs, 'isSet').withArgs('giftLinks').returns(true);
        giftLinksService.api = {getActiveByToken: sinon.stub().resolves(null)};

        await loadGiftLink(req, res, next);

        sinon.assert.notCalled(setStub);
        assert.equal(res.locals.giftLink, undefined);
        sinon.assert.calledOnce(next);
    });

    describe('countGiftRead', function () {
        const giftLink = {id: 'gl1', post_id: 'post-1', token: 'tok'};

        beforeEach(function () {
            giftLinksService.api = {recordRead: sinon.stub().resolves(1)};
        });

        it('counts a human read with no prior cookie, and sets the gift_seen cookie', function () {
            const ctx = makeReqRes({userAgent: HUMAN_UA});

            countGiftRead(ctx.req, ctx.res, giftLink);

            sinon.assert.calledOnceWithExactly(giftLinksService.api.recordRead, 'gl1');
            const setCookie = ctx.headers['set-cookie'];
            const cookieStr = Array.isArray(setCookie) ? setCookie.join(';') : String(setCookie);
            assert.match(cookieStr, /gift_seen_post-1=tok/, 'per-post cookie name avoids cross-post collisions');
            assert.match(cookieStr, /httponly/i);
            assert.match(cookieStr, /path=\/g\/my-post\//i);
        });

        it('does not count a bot/scanner read', function () {
            const ctx = makeReqRes({userAgent: BOT_UA});

            countGiftRead(ctx.req, ctx.res, giftLink);

            sinon.assert.notCalled(giftLinksService.api.recordRead);
        });

        it('does not double-count when the gift_seen cookie already matches the token', function () {
            const ctx = makeReqRes({userAgent: HUMAN_UA, cookieHeader: 'gift_seen_post-1=tok'});

            countGiftRead(ctx.req, ctx.res, giftLink);

            sinon.assert.notCalled(giftLinksService.api.recordRead);
        });

        it('counts again when the gift_seen cookie holds a different (reset) token', function () {
            const ctx = makeReqRes({userAgent: HUMAN_UA, cookieHeader: 'gift_seen_post-1=an-old-token'});

            countGiftRead(ctx.req, ctx.res, giftLink);

            sinon.assert.calledOnce(giftLinksService.api.recordRead);
        });

        it('no-ops when there is no gift link', function () {
            const ctx = makeReqRes({userAgent: HUMAN_UA});

            countGiftRead(ctx.req, ctx.res, null);

            sinon.assert.notCalled(giftLinksService.api.recordRead);
        });
    });
});
