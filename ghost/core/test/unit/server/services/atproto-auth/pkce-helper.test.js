const assert = require('node:assert/strict');
const {generateCodeVerifier, deriveCodeChallenge} = require('../../../../../core/server/services/atproto-auth/pkce-helper');

describe('PkceHelper', function () {
    describe('generateCodeVerifier', function () {
        it('produces a non-empty base64url string', function () {
            const v = generateCodeVerifier();
            assert.ok(v.length > 0);
            assert.ok(/^[A-Za-z0-9\-_]+$/.test(v), 'should be base64url safe');
        });

        it('produces a different value on each call', function () {
            const v1 = generateCodeVerifier();
            const v2 = generateCodeVerifier();
            assert.notEqual(v1, v2);
        });
    });

    describe('deriveCodeChallenge', function () {
        it('produces a non-empty string different from the verifier', function () {
            const v = generateCodeVerifier();
            const c = deriveCodeChallenge(v);
            assert.ok(c.length > 0);
            assert.notEqual(c, v);
        });

        it('is deterministic for the same verifier', function () {
            const v = generateCodeVerifier();
            assert.equal(deriveCodeChallenge(v), deriveCodeChallenge(v));
        });

        it('matches the known S256 output for a fixed verifier', function () {
            // RFC 7636 §Appendix B test vector
            const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
            const expected = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
            assert.equal(deriveCodeChallenge(verifier), expected);
        });
    });
});
