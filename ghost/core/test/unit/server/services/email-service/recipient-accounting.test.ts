import assert from 'node:assert/strict';
import sinon from 'sinon';
import logging from '@tryghost/logging';
import { recipientVerificationError } from '../../../../../core/server/services/email-service/recipient-accounting';

describe('Recipient verification errors', function () {
  let errorLog: sinon.SinonStub;
  beforeEach(function () {
    errorLog = sinon.stub(logging, 'error');
  });

  afterEach(function () {
    sinon.restore();
  });

  it('keeps diagnostic counts from classifying an ownership failure as a count mismatch', function () {
    const error = recipientVerificationError('email', 'cross_email_recipient', {
      expected: 2,
      actual: 1,
    });
    assert.equal(error.retryable, false);
    assert.equal(JSON.parse(error.errorDetails ?? '{}').count_mismatch, false);
    sinon.assert.calledOnceWithMatch(errorLog, {
      event: { name: 'email.verification.failed' },
    });
  });

  it('emits the count event for an explicitly classified discrepancy and retains recovery metadata', function () {
    const error = recipientVerificationError(
      'email',
      'batch_recipient_count',
      { expected: 2, actual: 1 },
      { canRebuild: true, countMismatch: true },
    );
    const details = JSON.parse(error.errorDetails ?? '{}');
    assert.equal(error.retryable, false);
    assert.equal(details.can_rebuild, true);
    assert.equal(details.count_mismatch, true);
    sinon.assert.calledOnceWithMatch(errorLog, {
      event: { name: 'email.recipient_count.mismatch' },
      expected: 2,
      actual: 1,
    });
  });

  it('does not emit the count event for unknown counts even when requested by a caller', function () {
    const error = recipientVerificationError(
      'email',
      'batch_recipient_count',
      { expected: null, actual: 1 },
      { countMismatch: true },
    );
    assert.equal(JSON.parse(error.errorDetails ?? '{}').count_mismatch, false);
    sinon.assert.calledOnceWithMatch(errorLog, {
      event: { name: 'email.verification.failed' },
    });
  });
});
