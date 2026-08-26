import assert from 'node:assert/strict';
import errors from '@tryghost/errors';
// @ts-expect-error This module lacks type definitions.
import { Milestone } from '../../../../core/server/models/milestone';

describe('Unit: models/milestone', function () {
  describe('validation', function () {
    describe('blank', function () {
      it('throws validation error for mandatory fields', function () {
        return Milestone.add({})
          .then(function () {
            throw new Error('expected ValidationError');
          })
          .catch(function (err: unknown) {
            assert(Array.isArray(err));
            assert.equal(err.length, 2);
            assert.equal(err[0] instanceof errors.ValidationError, true);
            assert.equal(err[1] instanceof errors.ValidationError, true);
            assert.match(err[0].message, /milestones\.type/);
            assert.match(err[1].message, /milestones\.value/);
          });
      });
    });
  });
});
