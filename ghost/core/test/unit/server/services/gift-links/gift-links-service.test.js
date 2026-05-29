const assert = require('node:assert/strict');
const GiftLinksService = require('../../../../../core/server/services/gift-links/gift-links-service');

describe('Unit: GiftLinksService token generation', function () {
    const service = new GiftLinksService({models: {}});

    it('generates a non-empty url-safe (base64url) string', function () {
        const token = service.generateToken();
        assert.equal(typeof token, 'string');
        assert.match(token, /^[A-Za-z0-9_-]+$/);
    });

    it('carries at least 128 bits of entropy', function () {
        const token = service.generateToken();
        // base64url has no padding; decoded length is the raw byte count
        const bytes = Buffer.from(token, 'base64url').length;
        assert.ok(bytes >= 16, `expected >=16 bytes of entropy, got ${bytes}`);
    });

    it('does not encode anything predictable (unique across calls)', function () {
        const tokens = new Set();
        for (let i = 0; i < 1000; i++) {
            tokens.add(service.generateToken());
        }
        assert.equal(tokens.size, 1000);
    });
});
