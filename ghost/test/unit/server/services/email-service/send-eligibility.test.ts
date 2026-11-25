import assert from 'node:assert/strict';
import {
  isRequestTooOld,
  isSendablePostStatus,
} from '../../../../../core/server/services/email-service/send-eligibility';

describe('send eligibility', function () {
  describe('isSendablePostStatus', function () {
    it('allows a published or sent post', function () {
      assert.equal(isSendablePostStatus('published'), true);
      assert.equal(isSendablePostStatus('sent'), true);
    });

    it('refuses any other post status, or a missing post', function () {
      for (const status of ['draft', 'scheduled', null, undefined]) {
        assert.equal(isSendablePostStatus(status), false, `${status}`);
      }
    });
  });

  describe('isRequestTooOld', function () {
    const now = new Date('2026-11-19T12:00:00Z');
    const maxAgeMs = 60 * 60 * 1000;
    const ago = (ms: number) => new Date(now.getTime() - ms);

    it('allows a request exactly the max age old and refuses one a moment older', function () {
      assert.equal(isRequestTooOld({ requestedAt: ago(maxAgeMs), maxAgeMs, now }), false);
      assert.equal(isRequestTooOld({ requestedAt: ago(maxAgeMs + 1), maxAgeMs, now }), true);
    });

    it('allows a send with no recorded request time', function () {
      assert.equal(isRequestTooOld({ requestedAt: null, maxAgeMs, now }), false);
    });
  });
});
