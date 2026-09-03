import { z } from 'zod';
import type { StoredSendingStatus } from './sending-status-schema';

const ETA_BATCH_WINDOW = 20;

export const SendingPhase = z.enum(['preparing', 'submitting']);
export type SendingPhase = z.infer<typeof SendingPhase>;

export const SendingProgress = z.object({
  completed: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  estimatedSecondsRemaining: z.number().int().nonnegative().nullable(),
});
export type SendingProgress = z.infer<typeof SendingProgress>;

export const EmailSendingStatus = z.object({
  id: z.string(),
  sending: z.discriminatedUnion('status', [
    z.object({ status: SendingPhase, progress: SendingProgress }),
    z.object({ status: z.literal('submitted'), progress: SendingProgress }),
    z.object({
      status: z.literal('failed'),
      progress: SendingProgress,
      failedDuring: SendingPhase,
    }),
  ]),
});
export type EmailSendingStatus = z.infer<typeof EmailSendingStatus>;

/** The email as the derivation reads it: its stored status, the recipient count it expects, and when the current attempt started. */
export interface SendingEmail {
  id: string;
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

export function sendingStatusForSubmittedEmail(email: {
  id: string;
  recipientCount: number;
}): EmailSendingStatus {
  const { recipientCount } = email;
  return {
    id: email.id,
    sending: {
      status: 'submitted',
      progress: { completed: recipientCount, total: recipientCount, estimatedSecondsRemaining: 0 },
    },
  };
}

export function sendingStatusFromBatches(
  email: SendingEmail,
  batches: SendingBatch[],
): EmailSendingStatus {
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
      id: email.id,
      sending: {
        status: 'failed',
        progress: { completed, total, estimatedSecondsRemaining: null },
        failedDuring: phase,
      },
    };
  }

  const failedThisAttempt = batches.filter((batch) => failedDuringAttempt(batch, attemptStartedAt));
  const remaining = total - completed - sumRecipients(failedThisAttempt);
  const samples = completedBatches.map((batch) => ({
    recipientCount: batch.recipientCount,
    timestamp: (phase === 'preparing' ? batch.createdAt : batch.updatedAt).getTime(),
  }));

  return {
    id: email.id,
    sending: {
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

  if (window.length < 2) {
    return null;
  }

  const elapsedSeconds = (window[window.length - 1].timestamp - window[0].timestamp) / 1000;
  if (elapsedSeconds <= 0) {
    return null;
  }

  const averageRecipientsPerBatch =
    window.reduce((sum, sample) => sum + sample.recipientCount, 0) / window.length;
  const recipientsPerSecond = (averageRecipientsPerBatch * (window.length - 1)) / elapsedSeconds;

  return Math.ceil(remaining / recipientsPerSecond);
}
