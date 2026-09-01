import assert from 'node:assert/strict';

import { queryParameterPolicy } from '../../../../core/server/web/query-parameter-policy';
import { parseQueryParameterPolicy } from '../../../../core/server/web/query-parameter-policy/schema';

const validPolicy = () => ({
  schemaVersion: 1,
  public: [{ name: 'gift', reason: 'Gift-link unlock token' }],
  contentApi: [{ name: 'filter', reason: 'Filters resources using NQL' }],
});

describe('Query parameter policy', function () {
  it('loads the canonical policy', function () {
    assert.equal(queryParameterPolicy.schemaVersion, 1);
    assert.ok(queryParameterPolicy.public.length > 0);
    assert.ok(queryParameterPolicy.contentApi.length > 0);
  });

  it('returns a normalized policy', function () {
    const policy = parseQueryParameterPolicy({
      ...validPolicy(),
      ignored: true,
      public: [{ name: 'gift', reason: 'Gift-link unlock token', ignored: true }],
    });

    assert.deepEqual(policy, validPolicy());
  });

  it.each([
    ['a non-object policy', null, /expected object/],
    [
      'an unsupported schema version',
      { ...validPolicy(), schemaVersion: 2 },
      /Unsupported schema version/,
    ],
    ['a non-array public list', { ...validPolicy(), public: {} }, /expected array/],
    ['a non-array Content API list', { ...validPolicy(), contentApi: {} }, /expected array/],
    [
      'an empty parameter name',
      { ...validPolicy(), public: [{ name: '', reason: 'Empty' }] },
      /Parameter names must be nonempty/,
    ],
    [
      'an invalid parameter name',
      { ...validPolicy(), public: [{ name: 'not valid&', reason: 'Invalid' }] },
      /must only contain letters, underscores, and hyphens/,
    ],
    [
      'an empty reason',
      { ...validPolicy(), public: [{ name: 'gift', reason: '   ' }] },
      /Parameter reasons must be nonempty/,
    ],
    [
      'a duplicate public name',
      { ...validPolicy(), public: Array(2).fill({ name: 'gift', reason: 'Gift link' }) },
      /Duplicate parameter name.*gift/,
    ],
    [
      'a duplicate Content API name',
      { ...validPolicy(), contentApi: Array(2).fill({ name: 'filter', reason: 'Filtering' }) },
      /Duplicate parameter name.*filter/,
    ],
  ])('rejects %s', function (_description, policy, error) {
    assert.throws(() => parseQueryParameterPolicy(policy), error);
  });

  it('allows the same name in both lists', function () {
    const sharedEntry = { name: 'filter', reason: 'Filters resources' };
    const policy = parseQueryParameterPolicy({
      schemaVersion: 1,
      public: [sharedEntry],
      contentApi: [sharedEntry],
    });

    assert.equal(policy.public[0].name, 'filter');
    assert.equal(policy.contentApi[0].name, 'filter');
  });
});
