import assert from 'node:assert/strict';
import sinon from 'sinon';
// @ts-expect-error This module lacks type definitions.
import { Permission } from '../../../../core/server/models/permission';
// @ts-expect-error This module lacks type definitions.
import configUtils from '../../../utils/config-utils';

describe('Unit: models/permission', function () {
  afterAll(async function () {
    sinon.restore();
    await configUtils.restore();
  });

  describe('add', function () {
    it('[error] validation', function () {
      return Permission.add({})
        .then(function () {
          assert.equal('Should fail', true);
        })
        .catch(function (err: unknown) {
          assert(Array.isArray(err));
          assert.equal(err.length, 3);
        });
    });
  });
});
