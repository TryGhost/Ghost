const should = require('should');
const normalizeEmail = require('../../../../../../../core/server/services/members/members-api/utils/normalize-email');

describe('normalizeEmail', function () {
    it('should normalize unicode domains to punycode', function () {
        normalizeEmail('test@еxample.com').should.equal('test@xn--xample-2of.com');
        normalizeEmail('user@tëst.org').should.equal('user@xn--tst-jma.org');
        normalizeEmail('foo@bär.baz').should.equal('foo@xn--br-via.baz');
    });

    it('should preserve ASCII domains unchanged', function () {
        normalizeEmail('user@example.com').should.equal('user@example.com');
        normalizeEmail('admin@test.org').should.equal('admin@test.org');
        normalizeEmail('foo@bar.baz').should.equal('foo@bar.baz');
    });

    it('should preserve unicode in the local part of the email', function () {
        normalizeEmail('üser@example.com').should.equal('üser@example.com');
        normalizeEmail('tëst@test.org').should.equal('tëst@test.org');
        normalizeEmail('用户@example.com').should.equal('用户@example.com');
    });

    it('should handle already punycoded domains', function () {
        normalizeEmail('test@xn--tst-jma.com').should.equal('test@xn--tst-jma.com');
        normalizeEmail('user@xn--br-via.baz').should.equal('user@xn--br-via.baz');
    });

    it('should preserve the case of the email address', function () {
        normalizeEmail('User@Example.COM').should.equal('User@Example.COM');
        normalizeEmail('Admin@TEST.org').should.equal('Admin@TEST.org');
    });

    it('should handle edge cases gracefully', function () {
        should.not.exist(normalizeEmail(null));
        should.not.exist(normalizeEmail(undefined));
        should.not.exist(normalizeEmail(''));
        normalizeEmail('invalid-email').should.equal('invalid-email');
        normalizeEmail('@example.com').should.equal('@example.com');
        normalizeEmail('user@').should.equal('user@');
    });

    it('should handle non-string inputs', function () {
        should.not.exist(normalizeEmail(123));
        should.not.exist(normalizeEmail({}));
        should.not.exist(normalizeEmail([]));
        should.not.exist(normalizeEmail(true));
    });

    it('should handle multiple @ symbols by using the last one', function () {
        normalizeEmail('user@name@example.com').should.equal('user@name@example.com');
        normalizeEmail('user@name@tëst.com').should.equal('user@name@xn--tst-jma.com');
    });
});
