import assert from 'node:assert/strict';
import { DbBoolean } from '../../../../../core/server/lib/db-types/boolean';

describe('DbBoolean', function () {
  describe('decode', function () {
    it('reads the 0 and 1 SQLite stores', function () {
      assert.strictEqual(DbBoolean.decode(0), false);
      assert.strictEqual(DbBoolean.decode(1), true);
    });

    it('reads the booleans MySQL returns', function () {
      assert.strictEqual(DbBoolean.decode(false), false);
      assert.strictEqual(DbBoolean.decode(true), true);
    });

    // A boolean column is a tinyint underneath, so it can hold a number neither
    // engine considers out of range. Both of them treat every non-zero value as
    // true, and so do we: a read is a worse place to discover the surprise than
    // wherever the value came from.
    it('reads any other number the column can hold as true', function () {
      assert.strictEqual(DbBoolean.decode(2), true);
      assert.strictEqual(DbBoolean.decode(-1), true);
    });

    it('rejects anything a boolean column cannot hold', function () {
      for (const stored of ['1', null, undefined, Number.NaN, {}]) {
        assert.throws(() => DbBoolean.decode(stored as never));
      }
    });
  });

  describe('encode', function () {
    it('writes booleans unchanged', function () {
      assert.strictEqual(DbBoolean.encode(false), false);
      assert.strictEqual(DbBoolean.encode(true), true);
    });
  });
});
