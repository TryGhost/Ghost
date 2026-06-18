import assert from 'node:assert/strict';
import {generateGiftLinkToken, GiftLinkToken} from '../../../../../core/server/services/gift-links/gift-link-token';

describe('Unit: gift link token', function () {
    it('generates a url-safe (base64url) string', function () {
        assert.match(generateGiftLinkToken(), /^[A-Za-z0-9_-]+$/);
    });

    it('carries at least 128 bits of entropy', function () {
        // base64url has no padding; decoded length is the raw byte count.
        assert.ok(Buffer.from(generateGiftLinkToken(), 'base64url').length >= 16);
    });

    it('is unique across calls', function () {
        const tokens = new Set();
        for (let i = 0; i < 1000; i++) {
            tokens.add(generateGiftLinkToken());
        }
        assert.equal(tokens.size, 1000);
    });

    it('parses a plain string into a branded token', function () {
        assert.equal(GiftLinkToken.parse('abc'), 'abc');
    });
});
