import assert from 'assert/strict';
import EmailAddressParser from '../../../../../core/server/services/email-address/EmailAddressParser.js';

describe('EmailAddressParser', function () {
    describe('parse', function () {
        it('should parse an email address', function () {
            const email = EmailAddressParser.parse('test@example.com');

            assert.ok(email);
            assert.deepEqual(email, {
                address: 'test@example.com',
                name: undefined
            });
        });

        it('should parse an email address with a name', function () {
            const email = EmailAddressParser.parse('"Test User" <test@example.com>');

            assert.ok(email);
            assert.deepEqual(email, {
                address: 'test@example.com',
                name: 'Test User'
            });
        });

        it('should parse an email address with a name and a comment', function () {
            const email = EmailAddressParser.parse('"Test User" <test@example.com> (Comment)');

            assert.ok(email);
            assert.deepEqual(email, {
                address: 'test@example.com',
                name: 'Test User'
            });
        });

        it('should handle an invalid email address', function () {
            const email = EmailAddressParser.parse('invalid');
            assert.deepEqual(email, {
                address: '',
                name: 'invalid'
            });
        });

        it('should handle an invalid email address with a name', function () {
            const email = EmailAddressParser.parse('"Test User" <invalid>');
            assert.deepEqual(email, {
                address: 'invalid',
                name: 'Test User'
            });
        });

        it('should return null for empty input', function () {
            const email = EmailAddressParser.parse('');
            assert.equal(email, null);
        });

        it('should return null for null input', function () {
            // @ts-ignore - Testing null input
            const email = EmailAddressParser.parse(null);
            assert.equal(email, null);
        });

        it('should return null for undefined input', function () {
            // @ts-ignore - Testing undefined input
            const email = EmailAddressParser.parse(undefined);
            assert.equal(email, null);
        });

        it('should return null for multiple email addresses', function () {
            const email = EmailAddressParser.parse('test1@example.com, test2@example.com');
            assert.equal(email, null);
        });

        it('should return null for group format', function () {
            const email = EmailAddressParser.parse('My Group: test@example.com;');
            assert.equal(email, null);
        });
    });

    describe('stringify', function () {
        it('should stringify an email address', function () {
            const email = EmailAddressParser.stringify({
                address: 'test@example.com',
                name: 'Test User'
            });
            assert.equal(email, '"Test User" <test@example.com>');
        });

        it('should stringify an email address without a name', function () {
            const email = EmailAddressParser.stringify({
                address: 'test@example.com'
            });
            assert.equal(email, 'test@example.com');
        });

        it('it should remove unsupported characters from the name', function () {
            const email = EmailAddressParser.stringify({
                address: 'test@example.com',
                name: 'This is my awesome name ✅ ✓ ✔ ☑ 🗸'
            });
            assert.equal(email, '"This is my awesome name" <test@example.com>');
        });
    });
});
