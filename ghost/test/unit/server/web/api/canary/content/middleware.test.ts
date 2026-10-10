import assert from 'node:assert/strict';
import { assertExists } from '../../../../../../utils/assertions';
// @ts-expect-error This module lacks type definitions.
import middleware from '../../../../../../../core/server/web/api/endpoints/content/middleware';

describe('Content API middleware', function () {
  it('exports an authenticatePublic middleware', function () {
    assertExists(middleware.authenticatePublic);
  });

  describe('authenticatePublic', function () {
    it('uses brute content api middleware as the first middleware in the chain', function () {
      const firstMiddleware = middleware.authenticatePublic[0];
      const brute = require('../../../../../../../core/server/web/shared/middleware/brute');

      assert.equal(firstMiddleware, brute.contentApiKey);
    });
  });
});
