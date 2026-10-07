import assert from 'node:assert/strict';
import {
  buildSendingStatus,
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

describe('buildSendingStatus', function () {
  it('reports a pending email without batches as preparing', function () {
    assert.deepEqual(buildSendingStatus(email({ status: 'pending', recipientCount: 100 }), []), {
      status: 'preparing',
      progress: { completed: 0, total: 100, estimatedSecondsRemaining: null },
    });
  });

  it('reports preparation progress and estimates from batch creation times', function () {
    const batches = [
      batch({ status: 'pending', createdAt: '12:00:00' }),
      batch({ status: 'pending', createdAt: '12:00:10' }),
      batch({ status: 'pending', createdAt: '12:00:20' }),
      batch({ status: 'pending', createdAt: '12:00:30' }),
      batch({ status: 'pending', createdAt: '12:00:40' }),
      batch({ status: 'pending', createdAt: '12:00:50' }),
    ];

    assert.deepEqual(buildSendingStatus(email({ recipientCount: 100 }), batches), {
      status: 'preparing',
      progress: { completed: 60, total: 100, estimatedSecondsRemaining: 40 },
    });
  });

  it('grows the total when more recipients are prepared than estimated', function () {
    const batches = [
      batch({ status: 'pending', createdAt: '12:00:00' }),
      batch({ status: 'pending', createdAt: '12:00:10' }),
    ];

    assert.deepEqual(buildSendingStatus(email({ recipientCount: 15 }), batches).progress, {
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

    const result = buildSendingStatus(
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
      batch({ status: 'submitted', createdAt: '12:00:30', updatedAt: '12:01:30' }),
      batch({ status: 'submitted', createdAt: '12:00:40', updatedAt: '12:01:40' }),
      batch({ status: 'submitted', createdAt: '12:00:50', updatedAt: '12:01:50' }),
      batch({ status: 'submitted', createdAt: '12:01:00', updatedAt: '12:02:00' }),
      batch({ status: 'pending', createdAt: '12:00:20' }),
    ];

    assert.deepEqual(
      buildSendingStatus(email({ recipientCount: 50, attemptStartedAt: at('12:01:00') }), batches),
      {
        status: 'submitting',
        progress: { completed: 60, total: 70, estimatedSecondsRemaining: 10 },
      },
    );
  });

  it('excludes batches that failed during the current attempt from the remaining work', function () {
    const batches = [
      batch({ status: 'submitted', createdAt: '12:00:00', updatedAt: '12:01:00' }),
      batch({ status: 'submitted', createdAt: '12:00:10', updatedAt: '12:01:10' }),
      batch({ status: 'submitted', createdAt: '12:00:20', updatedAt: '12:01:20' }),
      batch({ status: 'submitted', createdAt: '12:00:30', updatedAt: '12:01:30' }),
      batch({ status: 'submitted', createdAt: '12:00:40', updatedAt: '12:01:40' }),
      batch({ status: 'submitted', createdAt: '12:00:50', updatedAt: '12:01:50' }),
      batch({ status: 'failed', createdAt: '12:00:20', updatedAt: '12:01:15' }),
      batch({ status: 'pending', createdAt: '12:00:30' }),
    ];

    const result = buildSendingStatus(
      email({ recipientCount: 40, attemptStartedAt: at('12:00:30') }),
      batches,
    );
    assert.deepEqual(result.progress, {
      completed: 60,
      total: 80,
      estimatedSecondsRemaining: 10,
    });
  });

  it('reports no remaining time once only batches that failed during the attempt are left', function () {
    const batches = [
      batch({ status: 'submitted', createdAt: '12:00:00', updatedAt: '12:01:00' }),
      batch({ status: 'submitted', createdAt: '12:00:10', updatedAt: '12:01:10' }),
      batch({ status: 'failed', createdAt: '12:00:20', updatedAt: '12:01:15' }),
    ];

    const result = buildSendingStatus(
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
      buildSendingStatus(
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
      buildSendingStatus(
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
      buildSendingStatus(
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

    const result = buildSendingStatus(
      email({ recipientCount: 30, attemptStartedAt: at('12:02:00') }),
      batches,
    );
    assert.equal(result.progress.estimatedSecondsRemaining, null);
  });

  it('estimates without an attempt start when the email has never been saved', function () {
    const batches = [
      batch({ status: 'pending', createdAt: '12:00:00' }),
      batch({ status: 'pending', createdAt: '12:00:10' }),
      batch({ status: 'pending', createdAt: '12:00:20' }),
      batch({ status: 'pending', createdAt: '12:00:30' }),
      batch({ status: 'pending', createdAt: '12:00:40' }),
      batch({ status: 'pending', createdAt: '12:00:50' }),
    ];

    const result = buildSendingStatus(
      email({ recipientCount: 70, attemptStartedAt: null }),
      batches,
    );
    assert.equal(result.progress.estimatedSecondsRemaining, 10);
  });

  it('ignores batches without recipients when estimating', function () {
    const batches = [
      batch({ status: 'pending', createdAt: '12:00:00', recipientCount: 0 }),
      batch({ status: 'pending', createdAt: '12:00:10' }),
    ];

    assert.deepEqual(buildSendingStatus(email({ recipientCount: 30 }), batches).progress, {
      completed: 10,
      total: 30,
      estimatedSecondsRemaining: null,
    });
  });

  it('answers a submitted email from its recipient count without the batches', function () {
    const batches = [batch({ status: 'submitted', createdAt: '12:00:00', recipientCount: 4 })];

    assert.deepEqual(
      buildSendingStatus(email({ status: 'submitted', recipientCount: 10 }), batches),
      {
        status: 'submitted',
        progress: { completed: 10, total: 10, estimatedSecondsRemaining: 0 },
      },
    );
  });
  it('requires fresh intervals after the phase changes or an attempt restarts', function () {
    const batches = Array.from({ length: 7 }, (_, index) =>
      batch({ status: 'pending', createdAt: `12:00:${index}0`.replace('12:00:60', '12:01:00') }),
    );
    const currentEmail = email({ recipientCount: 100 });
    assert.equal(buildSendingStatus(currentEmail, batches).progress.estimatedSecondsRemaining, 30);

    for (let index = 0; index < 6; index += 1) {
      batches[index].status = 'submitted';
      batches[index].updatedAt = at(`12:02:${index}0`);
      const result = buildSendingStatus(currentEmail, batches);
      assert.equal(result.status, 'submitting');
      assert.equal(result.progress.completed, (index + 1) * 10);
      assert.equal(result.progress.estimatedSecondsRemaining, index < 2 ? null : (6 - index) * 10);
    }

    assert.equal(
      buildSendingStatus({ ...currentEmail, attemptStartedAt: at('12:02:40') }, batches).progress
        .estimatedSecondsRemaining,
      null,
    );
  });

  it('retains overlapping worker completions when estimating submission throughput', function () {
    // One worker completes small batches regularly; the other finishes a large
    // batch just after one of them. Both workers' recipients count as throughput.
    const batches = [
      batch({ status: 'submitted', createdAt: '12:00:00', updatedAt: '12:01:00' }),
      batch({ status: 'submitted', createdAt: '12:00:00', updatedAt: '12:01:10' }),
      batch({ status: 'submitted', createdAt: '12:00:00', updatedAt: '12:01:20' }),
      batch({
        status: 'submitted',
        createdAt: '12:00:00',
        updatedAt: '12:01:20.100',
        recipientCount: 1000,
      }),
      batch({ status: 'submitted', createdAt: '12:00:00', updatedAt: '12:01:30' }),
      batch({ status: 'submitted', createdAt: '12:00:00', updatedAt: '12:01:40' }),
      batch({ status: 'pending', createdAt: '12:00:00', recipientCount: 1040 }),
    ];
    assert.equal(
      buildSendingStatus(email({ recipientCount: 2090 }), batches).progress
        .estimatedSecondsRemaining,
      40,
    );
  });

  it('uses distinct completion timestamps for high-throughput sends', function () {
    for (const status of ['pending', 'submitted'] as const) {
      const completed = Array.from({ length: 30 }, (_, index) =>
        batch({ status, createdAt: `12:00:0${Math.floor(index / 10)}` }),
      );
      // Ten batches per second gives 100 recipients/second, with enough distinct
      // timestamps to estimate after only two seconds.
      const batches =
        status === 'pending'
          ? completed
          : [
              ...completed,
              batch({ status: 'pending', createdAt: '12:00:00', recipientCount: 100 }),
            ];
      assert.equal(
        buildSendingStatus(email({ recipientCount: 400 }), batches.reverse()).progress
          .estimatedSecondsRemaining,
        1,
      );
    }
  });

  it('smooths a brief submission slowdown using the full minute of throughput', function () {
    const timestamps = [
      ...Array.from({ length: 41 }, (_, index) => index),
      ...Array.from({ length: 10 }, (_, index) => 42 + index * 2),
    ];
    const batches: SendingBatch[] = timestamps.map((seconds) => ({
      status: 'submitted',
      recipientCount: 1000,
      createdAt: at('12:00:00'),
      updatedAt: new Date(at('12:00:00').getTime() + seconds * 1000),
    }));
    batches.push(batch({ status: 'pending', createdAt: '12:00:00', recipientCount: 100_000 }));

    // 50,000 recipients completed in the measured minute, including the slowdown.
    assert.deepEqual(buildSendingStatus(email({ recipientCount: 151_000 }), batches).progress, {
      completed: 51_000,
      total: 151_000,
      estimatedSecondsRemaining: 120,
    });
  });

  describe('recipient-weighted estimates', function () {
    function estimate(counts: number[], gaps: number[], remaining = 100) {
      let timestamp = at('12:00:00').getTime();
      const batches: SendingBatch[] = counts.map((recipientCount, index) => {
        timestamp += (gaps[index] ?? 0) * 1000;
        return {
          status: 'pending',
          recipientCount,
          createdAt: new Date(timestamp),
          updatedAt: new Date(timestamp),
        };
      });
      return buildSendingStatus(
        email({ recipientCount: counts.reduce((sum, count) => sum + count, remaining) }),
        batches.reverse(),
      ).progress.estimatedSecondsRemaining;
    }

    it('matches each interval to its recipients, excluding the baseline batch', function () {
      assert.equal(estimate([1000, 10, 100, 10, 100, 10], [0, 1, 10, 1, 10, 1]), 10);
      assert.equal(estimate([1, 100, 10, 100, 10, 100], [0, 10, 1, 10, 1, 10]), 10);
    });

    it('weights timings by recipient count rather than averaging rates', function () {
      assert.equal(estimate([10, 10, 100, 10, 100, 10, 100], [0, 2, 10, 2, 10, 2, 10], 330), 36);
    });

    it('includes both slow and fast completions in aggregate throughput', function () {
      assert.equal(estimate([10, 10, 10, 10, 10, 10, 10], [0, 1, 1, 10, 1, 0.01, 1]), 24);
    });

    it('retains large batches that take proportionally longer', function () {
      assert.equal(estimate([10, 10, 10, 1000, 10, 10], [0, 10, 10, 1000, 10, 10]), 100);
    });

    it('starts estimating after two measured intervals', function () {
      assert.equal(estimate([10], [0]), null);
      assert.equal(estimate([10, 10], [0, 10]), null);
      assert.equal(estimate([10, 10, 10], [0, 1, 1]), 10);
      assert.equal(estimate([10, 10, 10], [0, 10, 10]), 100);
      assert.equal(estimate([10, 10, 10], [0, 100, 10]), 550);
      assert.equal(estimate([10, 10, 10], [0, 100, 100]), 1000);
    });

    it('excludes the baseline recipients at the minute boundary', function () {
      assert.equal(estimate([10, 10, 1000, 10, 10], [0, 10, 10, 30, 30]), 300);
    });

    it('keeps the full interval that crosses the minute boundary', function () {
      assert.equal(estimate([10, 10, 1000, 10, 10], [0, 10, 10, 30, 35]), 325);
    });

    it('smooths a slow interval as more completions enter the window', function () {
      assert.equal(estimate([10, 10, 10, 10, 10], [0, 100, 10, 10, 10]), 325);
      assert.equal(estimate([10, 10, 10, 10, 10, 10], [0, 100, 10, 10, 10, 10]), 280);
    });

    it('combines simultaneous completions without losing their recipients', function () {
      assert.equal(estimate([10, 20, 30, 50, 50, 50, 50], [0, 10, 0, 10, 10, 10, 10]), 20);
      assert.equal(estimate([10, 20], [0, 0]), null);
      assert.equal(estimate(Array(10).fill(10), [0, 10, 0, 0, 0, 0, 0, 0, 0, 0]), null);
    });

    it('adapts to sustained slowdowns as old batches leave the window', function () {
      const counts = Array(40).fill(10);
      const gaps = [...Array(20).fill(1), ...Array(20).fill(10)];
      assert.equal(estimate(counts, gaps), 100);
    });
  });
});
