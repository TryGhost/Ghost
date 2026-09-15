const assert = require('node:assert/strict');
const {validateHandle} = require('../../../../../core/server/services/atproto-auth/did-resolver');

describe('DidResolver – handle validation', function () {
    describe('validateHandle', function () {
        it('accepts a valid single-label bsky.social handle', function () {
            assert.equal(validateHandle('alice.bsky.social'), 'alice.bsky.social');
        });

        it('strips a leading @ character', function () {
            assert.equal(validateHandle('@alice.bsky.social'), 'alice.bsky.social');
        });

        it('lowercases the result', function () {
            assert.equal(validateHandle('Alice.Bsky.Social'), 'alice.bsky.social');
        });

        it('accepts handles with hyphens', function () {
            assert.equal(validateHandle('my-name.bsky.social'), 'my-name.bsky.social');
        });

        it('throws for empty string', function () {
            assert.throws(() => validateHandle(''));
        });

        it('throws for a string containing spaces', function () {
            assert.throws(() => validateHandle('not a handle'));
        });

        it('throws for a URL-like string', function () {
            assert.throws(() => validateHandle('https://evil.com'));
        });

        it('throws for handle containing script-like content', function () {
            assert.throws(() => validateHandle('<script>alert(1)</script>'));
        });

        it('throws for null bytes', function () {
            assert.throws(() => validateHandle('alice\u0000.bsky.social'));
        });

        it('throws for a single-label domain (no TLD)', function () {
            assert.throws(() => validateHandle('alice'));
        });

        it('throws when handle exceeds 253 characters', function () {
            const longHandle = 'a'.repeat(64) + '.' + 'b'.repeat(64) + '.' + 'c'.repeat(64) + '.com';
            assert.throws(() => validateHandle(longHandle));
        });
    });
});
