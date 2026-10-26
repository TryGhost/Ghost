import assert from 'node:assert/strict';
import { assertExists } from '../../../utils/assertions';
// @ts-expect-error This module lacks type definitions.
import { SafeString } from '../../../../core/frontend/services/handlebars';
// @ts-expect-error encode currently lacks type definitions.
import encode from '../../../../core/frontend/helpers/encode';

describe('{{encode}} helper', function () {
  it('can escape URI', function () {
    const uri = '$pecial!Charact3r(De[iver]y)Foo #Bar';
    const expected = '%24pecial!Charact3r(De%5Biver%5Dy)Foo%20%23Bar';
    const escaped = encode(uri);

    assertExists(escaped);
    assert.equal(String(escaped), expected);
  });

  it('encodes real values unchanged', function () {
    assert.equal(String(encode('a b&c/?#[]')), 'a%20b%26c%2F%3F%23%5B%5D');

    const safe = encode(new SafeString('a b&c'));
    assert.ok(safe instanceof SafeString);
    assert.equal(String(safe), 'a%20b%26c');

    assert.equal(String(encode(42)), '42');
  });

  it('returns an empty string for empty values', function () {
    assert.equal(String(encode('')), '');
    assert.equal(String(encode(undefined)), '');
    assert.equal(String(encode(null)), '');
    assert.equal(String(encode(undefined, { hash: {} })), '');
  });

  it('returns an empty string when called without a value', function () {
    assert.equal(String(encode({ hash: {} })), '');
  });

  it('encodes 0 as "0"', function () {
    assert.equal(String(encode(0)), '0');
  });
});
