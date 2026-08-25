import assert from 'node:assert/strict';
import ExpressBrute from 'express-brute';
// @ts-expect-error This module lacks type definitions.
import * as spamPrevention from '../../../../../../../core/server/web/shared/middleware/api/spam-prevention';

describe('Spam Prevention', function () {
  describe('contentApiKey', function () {
    it('returns an instance of express-brute', function () {
      const result = spamPrevention.contentApiKey();

      assert(result instanceof ExpressBrute);
    });
  });
});
