import assert from 'node:assert/strict';
import {
  rejectAdminApiRestrictedFieldsTransformer,
  validateAdminApiBulkFilterTransformer,
} from '../../../../../core/server/api/endpoints/utils/api-filter-utils';

describe('API filter utils', function () {
  describe('rejectAdminApiRestrictedFieldsTransformer', function () {
    it('removes restricted fields from read filters', function () {
      assert.deepEqual(
        rejectAdminApiRestrictedFieldsTransformer({
          $and: [{ 'authors.password': 'hash' }, { status: 'published' }],
        }),
        {
          $and: [{ status: 'published' }],
        },
      );
    });
  });

  describe('validateAdminApiBulkFilterTransformer', function () {
    it('returns bulk filters without restricted fields unchanged', function () {
      const filter = {
        $and: [{ status: 'draft' }, { type: 'post' }],
      };

      assert.equal(validateAdminApiBulkFilterTransformer(filter), filter);
    });

    it('rejects restricted fields anywhere in a bulk filter path', function () {
      assert.throws(
        () =>
          validateAdminApiBulkFilterTransformer({
            $or: [{ status: 'draft' }, { 'authors.password.hash': 'guess' }],
          }),
        {
          name: 'BadRequestError',
          message: 'Restricted fields cannot be used in bulk operation filters.',
        },
      );
    });

    it('matches restricted field names case-insensitively', function () {
      assert.throws(
        () =>
          validateAdminApiBulkFilterTransformer({
            'authors.Password': 'guess',
          }),
        {
          name: 'BadRequestError',
        },
      );
    });
  });
});
