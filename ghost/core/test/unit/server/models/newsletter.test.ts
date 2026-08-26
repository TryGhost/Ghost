/* eslint no-invalid-this:0 */
import assert from 'node:assert/strict';
import errors from '@tryghost/errors';
import sinon from 'sinon';
// @ts-expect-error This module lacks type definitions.
import { Newsletter } from '../../../../core/server/models/newsletter';

describe('Unit: models/newsletter', function () {
  afterAll(function () {
    sinon.restore();
  });

  describe('validation', function () {
    describe('blank', function () {
      it('throws validation error for mandatory fields', function () {
        return Newsletter.add({})
          .then(function () {
            throw new Error('expected ValidationError');
          })
          .catch(function (err: unknown) {
            assert(Array.isArray(err));
            assert.equal(err.length, 2);
            assert.equal(err[0] instanceof errors.ValidationError, true);
            assert.equal(err[1] instanceof errors.ValidationError, true);
            assert.match(err[0].message, /newsletters\.name/);
            assert.match(err[1].message, /newsletters\.slug/);
          });
      });
    });
  });
});
