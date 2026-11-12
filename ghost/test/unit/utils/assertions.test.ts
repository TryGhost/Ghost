import assert from 'node:assert/strict';
import { assertArrayMatchesWithoutOrder, assertObjectMatches } from '../../utils/assertions';

type Loose = Record<string, unknown>;

describe('Test assertion helpers', function () {
  describe('assertObjectMatches', function () {
    it('accepts an object that has the expected properties', function () {
      assertObjectMatches({ id: 1, name: 'a', extra: true }, { id: 1, name: 'a' });
    });

    it('matches nested plain objects partially', function () {
      assertObjectMatches({ author: { id: 1, name: 'a' } }, { author: { id: 1 } });
    });

    it('compares arrays in full', function () {
      const actual: Loose = { tags: ['a', 'b'] };

      assertObjectMatches(actual, { tags: ['a', 'b'] });
      assert.throws(() => assertObjectMatches(actual, { tags: ['a'] }), {
        name: 'AssertionError',
      });
    });

    it('rejects a different value', function () {
      assert.throws(() => assertObjectMatches({ id: 1 }, { id: 2 }), { name: 'AssertionError' });
    });

    it('rejects a nested mismatch', function () {
      assert.throws(
        () => assertObjectMatches({ author: { id: 1, name: 'a' } }, { author: { id: 2 } }),
        { name: 'AssertionError' },
      );
    });

    it('rejects a plain object where a primitive is expected', function () {
      const actual: Loose = { count: {} };

      assert.throws(() => assertObjectMatches(actual, { count: 123 }), { name: 'AssertionError' });
    });

    it('rejects a plain object where null is expected', function () {
      const actual: Loose = { deletedAt: { value: 1 } };

      assert.throws(() => assertObjectMatches(actual, { deletedAt: null }), {
        name: 'AssertionError',
      });
    });

    it('rejects a primitive where an object is expected', function () {
      const actual: Loose = { author: 'a' };

      assert.throws(() => assertObjectMatches(actual, { author: { id: 1 } }), {
        name: 'AssertionError',
      });
    });
  });

  describe('assertArrayMatchesWithoutOrder', function () {
    it('accepts the expected items in any order', function () {
      assertArrayMatchesWithoutOrder(
        [
          { id: 1, name: 'a' },
          { id: 2, name: 'b' },
        ],
        [{ id: 2 }, { id: 1 }],
      );
    });

    it('rejects a different number of items', function () {
      assert.throws(() => assertArrayMatchesWithoutOrder([{ id: 1 }, { id: 2 }], [{ id: 1 }]), {
        name: 'AssertionError',
      });
    });

    it('rejects an item with a different value', function () {
      assert.throws(() => assertArrayMatchesWithoutOrder([{ id: 1 }], [{ id: 2 }]), {
        name: 'AssertionError',
      });
    });

    it('rejects a plain object where a primitive is expected', function () {
      const actual: Loose[] = [{ count: {} }];

      assert.throws(() => assertArrayMatchesWithoutOrder(actual, [{ count: 123 }]), {
        name: 'AssertionError',
      });
    });

    it('rejects a plain object where null is expected', function () {
      const actual: Loose[] = [{ deletedAt: { value: 1 } }];

      assert.throws(() => assertArrayMatchesWithoutOrder(actual, [{ deletedAt: null }]), {
        name: 'AssertionError',
      });
    });
  });
});
