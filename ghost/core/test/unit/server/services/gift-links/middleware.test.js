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
        path: '/my-post/',
        originalUrl: '/my-post/?gift=tok',
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
        req = {query: {}};
        setStub = sinon.stub();
        res = {locals: {}, set: setStub};
        next = sinon.stub();
    });

    afterEach(function () {
        sinon.restore();
        delete giftLinksService.api;
    });

    it('no-ops when there is no gift param', async function () {
        await loadGiftLink(req, res, next);

        sinon.assert.calledOnce(next);
        sinon.assert.notCalled(setStub);
        assert.equal(res.locals.giftLink, undefined);
    });

    it('no-ops (no headers, no grant) when the flag is disabled', async function () {
        req.query.gift = 'tok';
        sinon.stub(labs, 'isSet').returns(false);

        await loadGiftLink(req, res, next);

        sinon.assert.notCalled(setStub);
        assert.equal(res.locals.giftLink, undefined);
        sinon.assert.calledOnce(next);
    });

    it('sets noindex + referrer headers and grants for a valid token', async function () {
        req.query.gift = 'tok';
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

    it('ignores a non-string gift param (e.g. ?gift[$ne]= object/array)', async function () {
        req.query.gift = {$ne: 'x'};
        const isSetStub = sinon.stub(labs, 'isSet').returns(true);

        await loadGiftLink(req, res, next);

        // Short-circuits before the flag check and any DB lookup
        sinon.assert.notCalled(isSetStub);
        sinon.assert.notCalled(setStub);
        assert.equal(res.locals.giftLink, undefined);
        sinon.assert.calledOnce(next);
    });

    it('sets headers but no grant for an invalid/unknown token', async function () {
        req.query.gift = 'bad';
        sinon.stub(labs, 'isSet').withArgs('giftLinks').returns(true);
        giftLinksService.api = {getActiveByToken: sinon.stub().resolves(null)};

        await loadGiftLink(req, res, next);

        sinon.assert.calledWith(setStub, 'X-Robots-Tag', 'noindex');
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
