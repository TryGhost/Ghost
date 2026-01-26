const assert = require('node:assert/strict');
const normalizeEmail = require('../../../../../../../core/server/services/members/members-api/utils/normalize-email');

describe('normalizeEmail', function () {
    it('should normalize unicode domains to punycode', function () {
        assert.equal(normalizeEmail('test@еxample.com'), 'test@xn--xample-2of.com');
        assert.equal(normalizeEmail('user@tëst.org'), 'user@xn--tst-jma.org');
        assert.equal(normalizeEmail('foo@bär.baz'), 'foo@xn--br-via.baz');
    });

    it('should preserve ASCII domains unchanged', function () {
        assert.equal(normalizeEmail('user@example.com'), 'user@example.com');
        assert.equal(normalizeEmail('admin@test.org'), 'admin@test.org');
        assert.equal(normalizeEmail('foo@bar.baz'), 'foo@bar.baz');
    });

    it('should preserve unicode in the local part of the email', function () {
        assert.equal(normalizeEmail('üser@example.com'), 'üser@example.com');
        assert.equal(normalizeEmail('tëst@test.org'), 'tëst@test.org');
        assert.equal(normalizeEmail('用户@example.com'), '用户@example.com');
    });

    it('should handle already punycoded domains', function () {
        assert.equal(normalizeEmail('test@xn--tst-jma.com'), 'test@xn--tst-jma.com');
        assert.equal(normalizeEmail('user@xn--br-via.baz'), 'user@xn--br-via.baz');
    });

    it('should preserve the case of the email address', function () {
        assert.equal(normalizeEmail('User@Example.COM'), 'User@Example.COM');
        assert.equal(normalizeEmail('Admin@TEST.org'), 'Admin@TEST.org');
    });

    it('should handle edge cases gracefully', function () {
        assert.equal(normalizeEmail(null), null);
        assert.equal(normalizeEmail(undefined), null);
        assert.equal(normalizeEmail(''), null);
        assert.equal(normalizeEmail('invalid-email'), 'invalid-email');
        assert.equal(normalizeEmail('@example.com'), '@example.com');
        assert.equal(normalizeEmail('user@'), 'user@');
    });

    it('should handle non-string inputs', function () {
        assert.equal(normalizeEmail(/** @type {any} */ (123)), null);
        assert.equal(normalizeEmail(/** @type {any} */ ({})), null);
        assert.equal(normalizeEmail(/** @type {any} */ ([])), null);
        assert.equal(normalizeEmail(/** @type {any} */ (true)), null);
    });

    it('should handle multiple @ symbols by using the last one', function () {
        assert.equal(normalizeEmail('user@name@example.com'), 'user@name@example.com');
        assert.equal(normalizeEmail('user@name@tëst.com'), 'user@name@xn--tst-jma.com');
    });
});
