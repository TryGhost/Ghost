import { z } from 'zod';
import type { StoredSendingStatus } from './sending-status-schema';

const ETA_BATCH_WINDOW = 20;
const ETA_MIN_INTERVALS = 5;

export const SendingPhase = z.enum(['preparing', 'submitting']);
export type SendingPhase = z.infer<typeof SendingPhase>;

export const SendingProgress = z.object({
  completed: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  estimatedSecondsRemaining: z.number().int().nonnegative().nullable(),
});
export type SendingProgress = z.infer<typeof SendingProgress>;

export const SendingStatus = z.discriminatedUnion('status', [
  z.object({ status: SendingPhase, progress: SendingProgress }),
  z.object({ status: z.literal('submitted'), progress: SendingProgress }),
  z.object({ status: z.literal('failed'), progress: SendingProgress, failedDuring: SendingPhase }),
]);
export type SendingStatus = z.infer<typeof SendingStatus>;

export const EmailSendingStatus = z.object({
  id: z.string(),
  sending: SendingStatus,
});
export type EmailSendingStatus = z.infer<typeof EmailSendingStatus>;

/** The email as the derivation reads it: its stored status, the recipient count it expects, and when the current attempt started. */
export interface SendingEmail {
  status: StoredSendingStatus;
  recipientCount: number;
  attemptStartedAt: Date | null;
}

export interface SendingBatch {
  status: StoredSendingStatus;
  recipientCount: number;
  createdAt: Date;
  updatedAt: Date;
}

type BatchSample = { recipientCount: number; timestamp: number };

export function buildSendingStatus(email: SendingEmail, batches: SendingBatch[]): SendingStatus {
  // Submitted is terminal: every batch was accepted, so the email's own recipient count is the
  // answer and the batch aggregation below, which describes a send still in progress, does not apply.
  if (email.status === 'submitted') {
    return {
      status: 'submitted',
      progress: {
        completed: email.recipientCount,
        total: email.recipientCount,
        estimatedSecondsRemaining: 0,
      },
    };
  }

  const phase: SendingPhase = batches.some((batch) => batch.status !== 'pending')
    ? 'submitting'
    : 'preparing';
  const attemptStartedAt = email.attemptStartedAt?.getTime() ?? null;

  const preparedCount = sumRecipients(batches);
  const completedBatches =
    phase === 'preparing' ? batches : batches.filter((batch) => batch.status === 'submitted');
  const completed = sumRecipients(completedBatches);
  const total =
    phase === 'preparing' ? Math.max(email.recipientCount, preparedCount) : preparedCount;

  if (email.status === 'failed') {
    return {
      status: 'failed',
      progress: { completed, total, estimatedSecondsRemaining: null },
      failedDuring: phase,
    };
  }

  const failedThisAttempt = batches.filter((batch) => failedDuringAttempt(batch, attemptStartedAt));
  const remaining = total - completed - sumRecipients(failedThisAttempt);
  const samples = completedBatches.map((batch) => ({
    recipientCount: batch.recipientCount,
    timestamp: (phase === 'preparing' ? batch.createdAt : batch.updatedAt).getTime(),
  }));

  return {
    status: phase,
    progress: {
      completed,
      total,
      estimatedSecondsRemaining: estimateSecondsRemaining({
        remaining,
        samples,
        attemptStartedAt,
      }),
    },
  };
}

function sumRecipients(batches: SendingBatch[]): number {
  return batches.reduce((sum, batch) => sum + batch.recipientCount, 0);
}

// A batch that fails is only retried together with its email, so within an attempt it is finished work.
function failedDuringAttempt(batch: SendingBatch, attemptStartedAt: number | null): boolean {
  return (
    batch.status === 'failed' &&
    attemptStartedAt !== null &&
    batch.updatedAt.getTime() >= attemptStartedAt
  );
}

function estimateSecondsRemaining({
  remaining,
  samples,
  attemptStartedAt,
}: {
  remaining: number;
  samples: BatchSample[];
  attemptStartedAt: number | null;
}): number | null {
  if (remaining <= 0) {
    return 0;
  }

  const window = samples
    .filter(
      (sample) =>
        sample.recipientCount > 0 &&
        (attemptStartedAt === null || sample.timestamp >= attemptStartedAt),
    )
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-ETA_BATCH_WINDOW);

  // Coalesce completions sharing a timestamp so database timestamp precision does
  // not turn their recipients into zero-duration samples or make row order matter.
  const completions: BatchSample[] = [];
  for (const sample of window) {
    const previous = completions.at(-1);
    if (previous?.timestamp === sample.timestamp) {
      previous.recipientCount += sample.recipientCount;
    } else {
      completions.push({ ...sample });
    }
  }

  const intervals = completions.slice(1).map((sample, index) => {
    const seconds = (sample.timestamp - completions[index].timestamp) / 1000;
    return {
      recipientCount: sample.recipientCount,
      seconds,
      rate: seconds / sample.recipientCount,
    };
  });
  // Avoid publishing a startup estimate before outlier filtering has enough evidence.
  if (intervals.length < ETA_MIN_INTERVALS) {
    return null;
  }

  // Compare time per recipient, not batch duration: a larger batch is expected
  // to take longer.
  const rates = intervals.map((interval) => interval.rate).sort((a, b) => a - b);
  const middle = Math.floor(rates.length / 2);
  const median = rates.length % 2 === 0 ? (rates[middle - 1] + rates[middle]) / 2 : rates[middle];
  const retained = intervals.filter(
    (interval) => interval.rate >= median / 3 && interval.rate <= median * 3,
  );

  // The first completion is only the time baseline; its recipients were
  // processed before the measured interval. Weight retained timings by recipients.
  const seconds = retained.reduce((sum, interval) => sum + interval.seconds, 0);
  const recipients = retained.reduce((sum, interval) => sum + interval.recipientCount, 0);
  return Math.ceil((remaining * seconds) / recipients);
}
