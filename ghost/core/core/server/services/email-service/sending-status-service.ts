import type { Knex } from 'knex';
import { z } from 'zod';
import { DbDate } from '../../lib/db-types/date';

const ETA_BATCH_WINDOW = 20;

const StoredStatus = z.enum(['pending', 'submitting', 'submitted', 'failed']);
const DbCount = z.number().int().nonnegative();

const EmailRow = z.object({
  id: z.string(),
  status: StoredStatus,
  email_count: DbCount,
  updated_at: DbDate.nullable(),
});

const BatchRows = z.array(
  z.object({
    status: StoredStatus,
    created_at: DbDate,
    updated_at: DbDate,
    recipient_count: DbCount,
  }),
);

type EmailRow = z.output<typeof EmailRow>;
type Batch = z.output<typeof BatchRows>[number];
type BatchSample = { recipientCount: number; timestamp: number };

type SendingPhase = 'preparing' | 'submitting';
type SendingStatus = SendingPhase | 'submitted' | 'failed';

type SendingProgress = {
  completed: number;
  total: number;
  estimated_seconds_remaining: number | null;
};

type Sending = {
  status: SendingStatus;
  progress: SendingProgress;
  failed_during?: SendingPhase;
};

export type EmailSendingStatus = {
  id: string;
  sending: Sending;
};

export class SendingStatusService {
  #knex: Knex;

  constructor({ knex }: { knex: Knex }) {
    this.#knex = knex;
  }

  async statusFor(emailId: string): Promise<EmailSendingStatus | null> {
    const emailRow = await this.#knex('emails')
      .select('id', 'status', 'email_count', 'updated_at')
      .where('id', emailId)
      .first();

    if (!emailRow) {
      return null;
    }

    const email = EmailRow.parse(emailRow);
    const sending =
      email.status === 'submitted'
        ? await this.#submittedSending(emailId)
        : openSending(email, await this.#batchesFor(emailId));

    return { id: email.id, sending };
  }

  async #batchesFor(emailId: string): Promise<Batch[]> {
    // Correlated per-batch count stays on the batch_id index; grouping recipients by email_id scans every recipient row.
    const recipientCount = this.#knex('email_recipients as recipient')
      .count('*')
      .whereRaw('recipient.batch_id = batch.id');
    const rows = await this.#knex('email_batches as batch')
      .select('batch.status', 'batch.created_at', 'batch.updated_at')
      .select(recipientCount.as('recipient_count'))
      .where('batch.email_id', emailId);

    return BatchRows.parse(rows);
  }

  async #submittedSending(emailId: string): Promise<Sending> {
    const [countRow] = await this.#knex('email_recipients')
      .count({ count: '*' })
      .where('email_id', emailId);
    const count = DbCount.parse(countRow.count);

    return {
      status: 'submitted',
      progress: { completed: count, total: count, estimated_seconds_remaining: 0 },
    };
  }
}

function openSending(email: EmailRow, batches: Batch[]): Sending {
  const phase: SendingPhase = batches.some((batch) => batch.status !== 'pending')
    ? 'submitting'
    : 'preparing';
  const attemptStartedAt = email.updated_at?.getTime() ?? null;

  const preparedCount = sumRecipients(batches);
  const completedBatches =
    phase === 'preparing' ? batches : batches.filter((batch) => batch.status === 'submitted');
  const completed = sumRecipients(completedBatches);
  const total = phase === 'preparing' ? Math.max(email.email_count, preparedCount) : preparedCount;

  if (email.status === 'failed') {
    return {
      status: 'failed',
      progress: { completed, total, estimated_seconds_remaining: null },
      failed_during: phase,
    };
  }

  const failedThisAttempt = batches.filter((batch) => failedDuringAttempt(batch, attemptStartedAt));
  const remaining = total - completed - sumRecipients(failedThisAttempt);
  const samples = completedBatches.map((batch) => ({
    recipientCount: batch.recipient_count,
    timestamp: (phase === 'preparing' ? batch.created_at : batch.updated_at).getTime(),
  }));

  return {
    status: phase,
    progress: {
      completed,
      total,
      estimated_seconds_remaining: estimateSecondsRemaining({
        remaining,
        samples,
        attemptStartedAt,
      }),
    },
  };
}

function sumRecipients(batches: Batch[]): number {
  return batches.reduce((sum, batch) => sum + batch.recipient_count, 0);
}

// A batch that fails is only retried together with its email, so within an attempt it is finished work.
function failedDuringAttempt(batch: Batch, attemptStartedAt: number | null): boolean {
  return (
    batch.status === 'failed' &&
    attemptStartedAt !== null &&
    batch.updated_at.getTime() >= attemptStartedAt
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
