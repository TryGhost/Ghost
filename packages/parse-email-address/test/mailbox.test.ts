import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { parseMailbox, formatMailbox } from '../src/mailbox.ts';

describe('mailbox', function () {
  describe('parseMailbox', function () {
    it('should parse an email address', function () {
      const email = parseMailbox('test@example.com');

      assert.ok(email);
      assert.deepEqual(email, {
        address: 'test@example.com',
        name: undefined,
      });
    });

    it('should parse an email address with a name', function () {
      const email = parseMailbox('"Test User" <test@example.com>');

      assert.ok(email);
      assert.deepEqual(email, {
        address: 'test@example.com',
        name: 'Test User',
      });
    });

    it('should parse an email address with a name and a comment', function () {
      const email = parseMailbox('"Test User" <test@example.com> (Comment)');

      assert.ok(email);
      assert.deepEqual(email, {
        address: 'test@example.com',
        name: 'Test User',
      });
    });

    it('should handle an invalid email address', function () {
      const email = parseMailbox('invalid');
      assert.deepEqual(email, {
        address: '',
        name: 'invalid',
      });
    });

    it('should handle an invalid email address with a name', function () {
      const email = parseMailbox('"Test User" <invalid>');
      assert.deepEqual(email, {
        address: 'invalid',
        name: 'Test User',
      });
    });

    it('should return null for empty input', function () {
      const email = parseMailbox('');
      assert.equal(email, null);
    });

    it('should return null for null input', function () {
      // @ts-expect-error - Testing null input
      const email = parseMailbox(null);
      assert.equal(email, null);
    });

    it('should return null for undefined input', function () {
      // @ts-expect-error - Testing undefined input
      const email = parseMailbox(undefined);
      assert.equal(email, null);
    });

    it('should return null for multiple email addresses', function () {
      const email = parseMailbox('test1@example.com, test2@example.com');
      assert.equal(email, null);
    });

    it('should return null for group format', function () {
      const email = parseMailbox('My Group: test@example.com;');
      assert.equal(email, null);
    });

    it('preserves domain spelling while parsing a mailbox', function () {
      assert.deepEqual(parseMailbox('"Editor" <Local@中文.Example>'), {
        address: 'Local@中文.Example',
        name: 'Editor',
      });
    });
  });

  describe('formatMailbox', function () {
    it('should stringify an email address', function () {
      const email = formatMailbox({
        address: 'test@example.com',
        name: 'Test User',
      });
      assert.equal(email, '"Test User" <test@example.com>');
    });

    it('should stringify an email address without a name', function () {
      const email = formatMailbox({
        address: 'test@example.com',
      });
      assert.equal(email, 'test@example.com');
    });

    it('preserves display-name whitespace and leaves the mailbox unchanged', function () {
      const mailbox = Object.freeze({ address: 'Local@中文.Example', name: ' Editor ✅ ' });
      assert.equal(formatMailbox(mailbox), '" Editor ✅ " <Local@中文.Example>');
      assert.equal(mailbox.name, ' Editor ✅ ');
    });

    it('preserves Unicode display names', function () {
      const email = formatMailbox({
        address: 'test@example.com',
        name: 'This is my awesome name ✅ ✓ ✔ ☑ 🗸',
      });
      assert.equal(email, '"This is my awesome name ✅ ✓ ✔ ☑ 🗸" <test@example.com>');
    });

    it('escapes backslashes and double quotes in the name', function () {
      // Regression: the name is escaped once here (the single escaping point),
      // backslash before quote, so it stays a valid RFC 5322 quoted-string.
      const email = formatMailbox({
        address: 'test@example.com',
        name: 'a\\b"c',
      });
      assert.equal(email, '"a\\\\b\\"c" <test@example.com>');
    });
  });
});
