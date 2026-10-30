import assert from 'node:assert/strict';
import { ObjectIdSchema } from '../../../../../core/server/lib/db-types/object-id';
import ObjectId from 'bson-objectid';

describe('ObjectIdSchema', function () {
  it('reads valid ObjectId strings unchanged', function () {
    for (const stored of [
      ObjectId().toHexString(),
      '507f1f77bcf86cd799439011',
      '507F1F77BCF86CD799439011',
      '000000000000000000000000',
      'ffffffffffffffffffffffff',
    ]) {
      assert.strictEqual(ObjectIdSchema.parse(stored), stored);
    }
  });

  it('reads 12-character strings accepted by bson-objectid unchanged', function () {
    assert.strictEqual(ObjectIdSchema.parse('abcdefghijkl'), 'abcdefghijkl');
  });

  it('rejects malformed ObjectId strings', function () {
    for (const stored of [
      '',
      'not-an-object-id',
      '507f1f77bcf86cd79943901',
      '507f1f77bcf86cd7994390111',
      '507f1f77bcf86cd79943901g',
      ' 507f1f77bcf86cd799439011',
      '507f1f77bcf86cd799439011 ',
    ]) {
      assert.throws(() => ObjectIdSchema.parse(stored));
    }
  });

  it('rejects non-strings', function () {
    for (const stored of [
      null,
      undefined,
      42,
      true,
      {},
      [],
      { $oid: '507f1f77bcf86cd799439011' },
    ]) {
      assert.throws(() => ObjectIdSchema.parse(stored));
    }
  });
});
