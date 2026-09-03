import assert from 'node:assert/strict';
import {
  sendingStatusForSubmittedEmail,
  sendingStatusFromBatches,
  type SendingBatch,
  type SendingEmail,
} from '../../../../../core/server/services/email-service/sending-status';

const at = (time: string) => new Date(`2026-09-02T${time}Z`);

function email({
  status = 'submitting',
  recipientCount,
  attemptStartedAt = at('11:59:59'),
}: {
  status?: SendingEmail['status'];
  recipientCount: number;
  attemptStartedAt?: Date | null;
}): SendingEmail {
  return { status, recipientCount, attemptStartedAt };
}

function batch({
  status,
  createdAt,
  updatedAt = createdAt,
  recipientCount = 10,
}: {
  status: SendingBatch['status'];
  createdAt: string;
  updatedAt?: string;
  recipientCount?: number;
}): SendingBatch {
  return { status, recipientCount, createdAt: at(createdAt), updatedAt: at(updatedAt) };
}

describe('sending status', function () {
  describe('sendingStatusFromBatches', function () {
    it('reports a pending email without batches as preparing', function () {
      assert.deepEqual(
        sendingStatusFromBatches(email({ status: 'pending', recipientCount: 100 }), []),
        {
          status: 'preparing',
          progress: { completed: 0, total: 100, estimatedSecondsRemaining: null },
        },
      );
    });

    it('reports preparation progress and estimates from batch creation times', function () {
      const batches = [
        batch({ status: 'pending', createdAt: '12:00:00' }),
        batch({ status: 'pending', createdAt: '12:00:10' }),
      ];

      assert.deepEqual(sendingStatusFromBatches(email({ recipientCount: 100 }), batches), {
        status: 'preparing',
        progress: { completed: 20, total: 100, estimatedSecondsRemaining: 80 },
      });
    });

    it('grows the total when more recipients are prepared than estimated', function () {
      const batches = [
        batch({ status: 'pending', createdAt: '12:00:00' }),
        batch({ status: 'pending', createdAt: '12:00:10' }),
      ];

      assert.deepEqual(sendingStatusFromBatches(email({ recipientCount: 15 }), batches).progress, {
        completed: 20,
        total: 20,
        estimatedSecondsRemaining: 0,
      });
    });

    it('excludes batches created before the current attempt from the preparing estimate', function () {
      const batches = [
        batch({ status: 'pending', createdAt: '12:00:00' }),
        batch({ status: 'pending', createdAt: '12:00:10' }),
      ];

      const result = sendingStatusFromBatches(
        email({ recipientCount: 30, attemptStartedAt: at('12:00:11') }),
        batches,
      );
      assert.deepEqual(result.progress, {
        completed: 20,
        total: 30,
        estimatedSecondsRemaining: null,
      });
    });

    it('reports submission progress and estimates from submitted batch updates', function () {
      const batches = [
        batch({ status: 'submitted', createdAt: '12:00:00', updatedAt: '12:01:10' }),
        batch({ status: 'submitted', createdAt: '12:00:10', updatedAt: '12:01:20' }),
        batch({ status: 'pending', createdAt: '12:00:20' }),
      ];

      assert.deepEqual(
        sendingStatusFromBatches(
          email({ recipientCount: 50, attemptStartedAt: at('12:01:00') }),
          batches,
        ),
        {
          status: 'submitting',
          progress: { completed: 20, total: 30, estimatedSecondsRemaining: 10 },
        },
      );
    });

    it('excludes batches that failed during the current attempt from the remaining work', function () {
      const batches = [
        batch({ status: 'submitted', createdAt: '12:00:00', updatedAt: '12:01:00' }),
        batch({ status: 'submitted', createdAt: '12:00:10', updatedAt: '12:01:10' }),
        batch({ status: 'failed', createdAt: '12:00:20', updatedAt: '12:01:15' }),
        batch({ status: 'pending', createdAt: '12:00:30' }),
      ];

      const result = sendingStatusFromBatches(
        email({ recipientCount: 40, attemptStartedAt: at('12:00:30') }),
        batches,
      );
      assert.deepEqual(result.progress, {
        completed: 20,
        total: 40,
        estimatedSecondsRemaining: 10,
      });
    });

    it('reports no remaining time once only batches that failed during the attempt are left', function () {
      const batches = [
        batch({ status: 'submitted', createdAt: '12:00:00', updatedAt: '12:01:00' }),
        batch({ status: 'submitted', createdAt: '12:00:10', updatedAt: '12:01:10' }),
        batch({ status: 'failed', createdAt: '12:00:20', updatedAt: '12:01:15' }),
      ];

      const result = sendingStatusFromBatches(
        email({ recipientCount: 30, attemptStartedAt: at('12:00:30') }),
        batches,
      );
      assert.deepEqual(result.progress, {
        completed: 20,
        total: 30,
        estimatedSecondsRemaining: 0,
      });
    });

    it('reports the phase and frozen progress for a failed send', function () {
      const batches = [
        batch({ status: 'submitted', createdAt: '12:00:00', updatedAt: '12:01:10' }),
        batch({ status: 'failed', createdAt: '12:00:10', updatedAt: '12:01:20' }),
      ];

      assert.deepEqual(
        sendingStatusFromBatches(
          email({ status: 'failed', recipientCount: 20, attemptStartedAt: at('12:01:20') }),
          batches,
        ),
        {
          status: 'failed',
          progress: { completed: 10, total: 20, estimatedSecondsRemaining: null },
          failedDuring: 'submitting',
        },
      );
    });

    it('reports a failure during preparation when no batch started submitting', function () {
      const batches = [batch({ status: 'pending', createdAt: '12:00:00' })];

      assert.deepEqual(
        sendingStatusFromBatches(
          email({ status: 'failed', recipientCount: 20, attemptStartedAt: at('12:00:01') }),
          batches,
        ),
        {
          status: 'failed',
          progress: { completed: 10, total: 20, estimatedSecondsRemaining: null },
          failedDuring: 'preparing',
        },
      );
    });

    it('keeps the frozen submission progress of a retried email while it waits for its job', function () {
      const batches = [
        batch({ status: 'submitted', createdAt: '12:00:00', updatedAt: '12:01:10' }),
        batch({ status: 'failed', createdAt: '12:00:10', updatedAt: '12:01:20' }),
      ];

      assert.deepEqual(
        sendingStatusFromBatches(
          email({ status: 'pending', recipientCount: 20, attemptStartedAt: at('12:05:00') }),
          batches,
        ),
        {
          status: 'submitting',
          progress: { completed: 10, total: 20, estimatedSecondsRemaining: null },
        },
      );
    });

    it('excludes batches submitted before the current attempt from the submitting estimate', function () {
      const batches = [
        batch({ status: 'submitted', createdAt: '12:00:00', updatedAt: '12:01:00' }),
        batch({ status: 'submitted', createdAt: '12:00:10', updatedAt: '12:02:10' }),
        batch({ status: 'pending', createdAt: '12:00:20' }),
      ];

      const result = sendingStatusFromBatches(
        email({ recipientCount: 30, attemptStartedAt: at('12:02:00') }),
        batches,
      );
      assert.equal(result.progress.estimatedSecondsRemaining, null);
    });

    it('estimates without an attempt start when the email has never been saved', function () {
      const batches = [
        batch({ status: 'pending', createdAt: '12:00:00' }),
        batch({ status: 'pending', createdAt: '12:00:10' }),
      ];

      const result = sendingStatusFromBatches(
        email({ recipientCount: 30, attemptStartedAt: null }),
        batches,
      );
      assert.equal(result.progress.estimatedSecondsRemaining, 10);
    });

    it('ignores batches without recipients when estimating', function () {
      const batches = [
        batch({ status: 'pending', createdAt: '12:00:00', recipientCount: 0 }),
        batch({ status: 'pending', createdAt: '12:00:10' }),
      ];

      assert.deepEqual(sendingStatusFromBatches(email({ recipientCount: 30 }), batches).progress, {
        completed: 10,
        total: 30,
        estimatedSecondsRemaining: null,
      });
    });
  });

  describe('sendingStatusForSubmittedEmail', function () {
    it('reports submitted sends as complete from their recipient count', function () {
      assert.deepEqual(sendingStatusForSubmittedEmail(10), {
        status: 'submitted',
        progress: { completed: 10, total: 10, estimatedSecondsRemaining: 0 },
      });
    });
  });
});
