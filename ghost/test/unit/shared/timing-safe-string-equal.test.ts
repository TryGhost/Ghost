import assert from 'node:assert/strict';
import { timingSafeStringEqual } from '../../../core/shared/timing-safe-string-equal';

describe('timingSafeStringEqual', function () {
  const digest = 'a'.repeat(64);

  it('matches an identical string', function () {
    assert.equal(timingSafeStringEqual(digest, 'a'.repeat(64)), true);
  });

  it('rejects a string of the same length that differs', function () {
    assert.equal(timingSafeStringEqual(digest, `${'a'.repeat(63)}b`), false);
  });

  it('rejects distinct strings that UTF-8 encodes identically', function () {
    assert.equal(timingSafeStringEqual('\udc69', '\udc6a'), false);
  });

  it('rejects a string of a different length without throwing', function () {
    assert.equal(timingSafeStringEqual(digest, 'a'.repeat(63)), false);
    assert.equal(timingSafeStringEqual(digest, 'a'.repeat(65)), false);
    assert.equal(timingSafeStringEqual(digest, ''), false);
  });

  it('rejects a string with the same number of characters but a different byte length', function () {
    assert.equal(timingSafeStringEqual(digest, `${'a'.repeat(63)}é`), false);
  });

  it('rejects values that are not strings', function () {
    assert.equal(timingSafeStringEqual(digest, undefined), false);
    assert.equal(timingSafeStringEqual(digest, null), false);
    assert.equal(timingSafeStringEqual(digest, [digest]), false);
    assert.equal(timingSafeStringEqual(digest, { key: digest }), false);
  });
});
