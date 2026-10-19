import assert from 'node:assert/strict';
import * as sinon from 'sinon';
import { DefaultMap } from '../../../core/shared/default-map';

describe('DefaultMap', function () {
  it('creates a default value for each key', function () {
    const map = new DefaultMap<string, number[]>(() => []);

    const defaulted = map.get('a');
    assert.deepEqual(defaulted, [], 'returns a default value');
    assert.equal(map.get('a'), defaulted, 'returns the same value each time');

    map.set('a', [1, 2, 3]);
    assert.deepEqual(map.get('a'), [1, 2, 3], 'returns explicitly set values');
  });

  it("doesn't generate a default value for keys that are already set", function () {
    const factory = sinon.spy(() => []);
    const map = new DefaultMap<string, number[]>(factory);

    map.set('a', [4, 5, 6]);

    assert.deepEqual(map.get('a'), [4, 5, 6]);
    sinon.assert.notCalled(factory);
  });

  describe('set', function () {
    it('returns the map instance', function () {
      const map = new DefaultMap<string, number[]>(() => []);
      const result = map.set('a', [1, 2, 3]);
      assert.equal(result, map);
    });
  });

  describe('values', function () {
    it('returns values in map insertion order', function () {
      const map = new DefaultMap<string, string>(() => 'default');

      map.get('first');
      map.set('second', 'explicit');

      assert.deepEqual(Array.from(map.values()), ['default', 'explicit']);
    });
  });
});
