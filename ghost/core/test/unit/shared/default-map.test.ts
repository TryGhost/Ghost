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

  describe('clear', function () {
    it('removes explicit and defaulted values and creates fresh defaults afterward', function () {
      const factory = sinon.spy(() => []);
      const map = new DefaultMap<string, number[]>(factory);

      const oldDefault = map.get('defaulted');
      oldDefault.push(123);
      map.set('explicit', [456]);
      sinon.assert.calledOnce(factory);

      map.clear();
      assert.deepEqual(Array.from(map.entries()), []);

      const freshDefault = map.get('defaulted');
      assert.deepEqual(freshDefault, []);
      assert.notEqual(freshDefault, oldDefault);
      sinon.assert.calledTwice(factory);
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

  describe('entries', function () {
    it('returns key-value pairs in insertion order, including defaulted values', function () {
      const map = new DefaultMap<string, string>(() => 'default');

      map.get('first');
      map.set('second', 'explicit');
      map.set('first', 'updated');

      assert.deepEqual(Array.from(map.entries()), [
        ['first', 'updated'],
        ['second', 'explicit'],
      ]);
    });

    it('returns no entries for an empty map without generating defaults', function () {
      const factory = sinon.spy(() => 'default');
      const map = new DefaultMap<string, string>(factory);

      assert.deepEqual(Array.from(map.entries()), []);
      sinon.assert.notCalled(factory);
    });
  });

  describe('Symbol.iterator', function () {
    it('returns key-value pairs in insertion order, including defaulted values', function () {
      const map = new DefaultMap<string, string>(() => 'default');

      map.get('first');
      map.set('second', 'explicit');
      map.set('first', 'updated');

      assert.deepEqual(Array.from(map), [
        ['first', 'updated'],
        ['second', 'explicit'],
      ]);
    });

    it('returns no entries for an empty map without generating defaults', function () {
      const factory = sinon.spy(() => 'default');
      const map = new DefaultMap<string, string>(factory);

      assert.deepEqual(Array.from(map), []);
      sinon.assert.notCalled(factory);
    });
  });
});
