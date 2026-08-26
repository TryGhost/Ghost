import assert from 'node:assert/strict';
import sinon from 'sinon';
import errors from '@tryghost/errors';
// @ts-expect-error This module lacks type definitions.
import { MemberSubscribeEvent } from '../../../../core/server/models/member-subscribe-event';

describe('Unit: models/MemberSubscribeEvent', function () {
  afterEach(function () {
    sinon.restore();
  });

  describe('validation', function () {
    it('throws if source is invalid', function () {
      return MemberSubscribeEvent.add({ member_id: '123', source: 'invalid' })
        .then(function () {
          throw new Error('expected ValidationError');
        })
        .catch(function (err: unknown) {
          assert(Array.isArray(err));
          assert.equal(err.length, 1);
          assert.equal(err[0] instanceof errors.ValidationError, true);
          assert.match(err[0].context, /members_subscribe_events\.source/);
        });
    });
  });
});
