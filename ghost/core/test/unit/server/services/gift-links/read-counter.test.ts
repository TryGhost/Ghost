import assert from 'node:assert/strict';
import sinon from 'sinon';

const giftLinks = require('../../../../../core/server/services/gift-links');
const recordRead = require('../../../../../core/server/services/gift-links/read-counter') as (_req: any, _res: any, _read: {token: string; postId: string}) => void;
const urlUtils = require('../../../../../core/shared/url-utils');

const HUMAN_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const BOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

const POST_ID = '6123456789abcdef01234567';
const TOKEN = 'live-token-abc';
const COOKIE_NAME = `ghost-gift-seen-${POST_ID}`;

function makeReq({ua, cookie}: {ua?: string; cookie?: string} = {}): any {
    return {
        get: (header: string) => (header.toLowerCase() === 'user-agent' ? ua : undefined),
        headers: cookie ? {cookie} : {},
        originalUrl: '/g/my-post/?key=' + TOKEN
    };
}

function makeRes(): any {
    const headers: Record<string, unknown> = {};
    return {
        getHeader: (k: string) => headers[k],
        setHeader: (k: string, v: unknown) => {
            headers[k] = v;
        },
        _headers: headers
    };
}

function setCookieHeader(res: any): string {
    const raw = res.getHeader('Set-Cookie') || [];
    return (Array.isArray(raw) ? raw : [raw]).join('\n');
}

describe('Unit - gift-links/read-counter', function () {
    let recordRedemption: sinon.SinonStub;

    beforeEach(function () {
        recordRedemption = sinon.stub().resolves(1);
        giftLinks.setService({recordRedemption});
    });

    afterEach(function () {
        giftLinks.setService(undefined);
        sinon.restore();
    });

    it('does not count bot/scanner reads', function () {
        const res = makeRes();
        recordRead(makeReq({ua: BOT_UA}), res, {token: TOKEN, postId: POST_ID});

        sinon.assert.notCalled(recordRedemption);
        assert.equal(res.getHeader('Set-Cookie'), undefined, 'must not set the dedup cookie for bots');
    });

    it('counts a human read once and sets a long-lived per-post dedup cookie', function () {
        const res = makeRes();
        recordRead(makeReq({ua: HUMAN_UA}), res, {token: TOKEN, postId: POST_ID});

        sinon.assert.calledOnceWithExactly(recordRedemption, TOKEN);

        const setCookie = setCookieHeader(res);
        assert.match(setCookie, new RegExp(`${COOKIE_NAME}=${TOKEN}`), 'cookie name is post-scoped, value is the token');
        assert.match(setCookie, /httponly/i);
        assert.match(setCookie, /samesite=lax/i);
        // Scoped to the /g/ prefix, not the slug path, so dedup survives a slug
        // rename (the cookie name already encodes the post id).
        assert.match(setCookie, /path=\/g\//i);
        assert.doesNotMatch(setCookie, /path=\/g\/my-post\//i);
        // Long-lived (≈1 year) so dedup survives across browser sessions.
        const expiresMatch = setCookie.match(/expires=([^;]+)/i);
        assert.ok(expiresMatch, 'cookie carries an explicit expiry (not a session cookie)');
        const expiresAt = new Date(expiresMatch![1]);
        assert.ok(expiresAt.getTime() > Date.now() + 300 * 24 * 60 * 60 * 1000, 'expiry is far in the future');
    });

    it('de-dupes a repeat view from the same client (cookie already matches the token)', function () {
        const res = makeRes();
        recordRead(makeReq({ua: HUMAN_UA, cookie: `${COOKIE_NAME}=${TOKEN}`}), res, {token: TOKEN, postId: POST_ID});

        sinon.assert.notCalled(recordRedemption);
    });

    it('still counts when the existing cookie is for a different token (re-issued link)', function () {
        const res = makeRes();
        recordRead(makeReq({ua: HUMAN_UA, cookie: `${COOKIE_NAME}=an-older-token`}), res, {token: TOKEN, postId: POST_ID});

        sinon.assert.calledOnceWithExactly(recordRedemption, TOKEN);
    });

    it('marks the cookie Secure behind a TLS-terminating proxy without throwing (constructor-level secure)', function () {
        // Site is https but the proxy hands origin a plain http request: passing
        // `secure` per-`.set()` would throw and skip the count. Constructor-level
        // secure (what the counter uses) must set Secure and still count.
        // `urlUtils.isSSL` is a getter that returns the isSSL function, so stub
        // the getter to hand back a function that reports the site as https.
        sinon.stub(urlUtils, 'isSSL').get(() => () => true);
        const res = makeRes();

        recordRead(makeReq({ua: HUMAN_UA}), res, {token: TOKEN, postId: POST_ID});

        sinon.assert.calledOnceWithExactly(recordRedemption, TOKEN);
        assert.match(setCookieHeader(res), /secure/i, 'cookie is marked Secure');
    });

    it('never throws out of recordRead even if the redemption write rejects', function () {
        recordRedemption.rejects(new Error('db down'));
        const res = makeRes();

        assert.doesNotThrow(() => recordRead(makeReq({ua: HUMAN_UA}), res, {token: TOKEN, postId: POST_ID}));
    });
});
