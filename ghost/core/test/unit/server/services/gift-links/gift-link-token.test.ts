import assert from 'node:assert/strict';
import {generateGiftLinkToken} from '../../../../../core/server/services/gift-links/service';

describe('Unit: generateGiftLinkToken', function () {
    it('generates a non-empty url-safe (base64url) string', function () {
        const token = generateGiftLinkToken();
        assert.equal(typeof token, 'string');
        assert.match(token, /^[A-Za-z0-9_-]+$/);
    });

    it('carries at least 128 bits of entropy', function () {
        // base64url has no padding; decoded length is the raw byte count.
        const bytes = Buffer.from(generateGiftLinkToken(), 'base64url').length;
        assert.ok(bytes >= 16, `expected >=16 bytes of entropy, got ${bytes}`);
    });

    it('does not repeat across many calls', function () {
        const tokens = new Set();
        for (let i = 0; i < 1000; i++) {
            tokens.add(generateGiftLinkToken());
        }
        assert.equal(tokens.size, 1000);
    });
});
