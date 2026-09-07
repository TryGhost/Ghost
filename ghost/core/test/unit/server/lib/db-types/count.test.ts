import assert from 'node:assert/strict';
import { DbCount } from '../../../../../core/server/lib/db-types/count';

describe('DbCount', function () {
  describe('decode', function () {
    it('reads numeric counts', function () {
      assert.strictEqual(DbCount.decode(0), 0);
      assert.strictEqual(DbCount.decode(42), 42);
      assert.strictEqual(DbCount.decode(Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER);
    });

    it('reads decimal string counts', function () {
      assert.strictEqual(DbCount.decode('0'), 0);
      assert.strictEqual(DbCount.decode('42'), 42);
      assert.strictEqual(DbCount.decode(String(Number.MAX_SAFE_INTEGER)), Number.MAX_SAFE_INTEGER);
    });

    it('rejects values that are not non-negative safe integers', function () {
      for (const stored of [
        -1,
        1.5,
        Number.MAX_SAFE_INTEGER + 1,
        Number.NaN,
        Number.POSITIVE_INFINITY,
        '-1',
        '1.5',
        String(Number.MAX_SAFE_INTEGER + 1),
        '',
        'not-a-count',
        null,
        undefined,
        {},
      ]) {
        assert.throws(() => DbCount.decode(stored as never));
      }
    });
  });

  describe('encode', function () {
    it('writes counts unchanged', function () {
      assert.strictEqual(DbCount.encode(0), 0);
      assert.strictEqual(DbCount.encode(42), 42);
    });
  });
});
