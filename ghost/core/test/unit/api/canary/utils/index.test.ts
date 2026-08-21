import assert from 'node:assert/strict';
import sinon from 'sinon';
// @ts-expect-error This module lacks type definitions.
import utils from '../../../../../core/server/api/endpoints/utils';

describe('Unit: endpoints/utils/index', function () {
  afterEach(function () {
    sinon.restore();
  });

  describe('isContentAPI', function () {
    it('is true when apiType is "content"', function () {
      const frame = {
        apiType: 'content',
      };
      assert.equal(utils.isContentAPI(frame), true);
    });

    it('is false when apiType is admin', function () {
      const frame = {
        apiType: 'admin',
        options: {
          context: {
            no: 'public',
          },
        },
      };
      assert.equal(utils.isContentAPI(frame), false);
    });
  });
});
