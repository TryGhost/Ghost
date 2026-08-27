import assert from 'node:assert/strict';
import sinon from 'sinon';
import errors from '@tryghost/errors';
// @ts-expect-error This module lacks type definitions.
import models from '../../../../core/server/models';

const { MemberFeedback } = models;

describe('Unit: models/MemberFeedback', function () {
  afterEach(function () {
    sinon.restore();
  });

  describe('validation', function () {
    it('throws if member_id is missing', function () {
      return MemberFeedback.add({ score: 1, post_id: 'post' })
        .then(function () {
          throw new Error('expected ValidationError');
        })
        .catch(function (err: unknown) {
          assert(Array.isArray(err));
          assert.equal(err.length, 1);
          assert.equal(err[0] instanceof errors.ValidationError, true);
          assert.match(err[0].context, /members_feedback\.member_id/);
        });
    });

    it('throws if post_id is missing', function () {
      return MemberFeedback.add({ score: 1, member_id: '123' })
        .then(function () {
          throw new Error('expected ValidationError');
        })
        .catch(function (err: unknown) {
          assert(Array.isArray(err));
          assert.equal(err.length, 1);
          assert.equal(err[0] instanceof errors.ValidationError, true);
          assert.match(err[0].context, /members_feedback\.post_id/);
        });
    });
  });

  it('Delete is disabled', function () {
    return MemberFeedback.destroy({ id: 'any' })
      .then(function () {
        throw new Error('expected IncorrectUsageError');
      })
      .catch(function (err: unknown) {
        assert.equal(err instanceof errors.IncorrectUsageError, true);
      });
  });

  it('Has post and member relations', function () {
    const model = MemberFeedback.forge({ id: 'any' });
    model.post();
    model.member();
  });
});
