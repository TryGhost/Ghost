import type { Knex } from 'knex';

const ETA_BATCH_WINDOW = 20;

type SendingPhase = 'preparing' | 'submitting';
type SendingStatus = SendingPhase | 'submitted' | 'failed';
type StoredEmailStatus = 'pending' | 'submitting' | 'submitted' | 'failed';
type StoredBatchStatus = 'pending' | 'submitting' | 'submitted' | 'failed';

type EmailRow = {
  id: string;
  status: StoredEmailStatus;
  email_count: number;
  updated_at: Date | string | null;
};

type BatchRow = {
  status: StoredBatchStatus;
  recipient_count: number | string;
  created_at: Date | string;
  updated_at: Date | string;
};

type Batch = {
  status: StoredBatchStatus;
  recipientCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type SendingProgress = {
  completed: number;
  total: number;
  estimated_seconds_remaining: number | null;
};

export type EmailSendingStatus = {
  id: string;
  sending: {
    status: SendingStatus;
    progress: SendingProgress;
    failed_during?: SendingPhase;
  };
};

type Database = {
  knex: Knex;
};

export class SendingStatusService {
  #db: Database;

  constructor({ db }: { db: Database }) {
    this.#db = db;
  }

  async statusFor(emailId: string): Promise<EmailSendingStatus | null> {
    const email = await this.#db
      .knex<EmailRow>('emails')
      .select('id', 'status', 'email_count', 'updated_at')
      .where('id', emailId)
      .first();

    if (!email) {
      return null;
    }

    const recipientCount = this.#db
      .knex('email_recipients as recipient')
      .count('recipient.id')
      .whereRaw('recipient.batch_id = batch.id');
    const batchRows = await this.#db
      .knex<BatchRow>('email_batches as batch')
      .select('batch.status', 'batch.created_at', 'batch.updated_at')
      .select(recipientCount.as('recipient_count'))
      .where('batch.email_id', emailId);
    const batches = batchRows.map((batch) => ({
      status: batch.status,
      recipientCount: Number(batch.recipient_count),
      createdAt: batch.created_at,
      updatedAt: batch.updated_at,
    }));

    return this.#buildStatus(email, batches);
  }

  #buildStatus(email: EmailRow, batches: Batch[]): EmailSendingStatus {
    const submissionStarted = batches.some((batch) => batch.status !== 'pending');
    const failedDuring = submissionStarted ? 'submitting' : 'preparing';
    const status =
      email.status === 'submitted' || email.status === 'failed'
        ? email.status
        : submissionStarted
          ? 'submitting'
          : 'preparing';
    const progressStatus = status === 'failed' ? failedDuring : status;

    const preparedCount = batches.reduce((total, batch) => total + batch.recipientCount, 0);
    const submittedCount = batches
      .filter((batch) => batch.status === 'submitted')
      .reduce((total, batch) => total + batch.recipientCount, 0);
    const completed = progressStatus === 'preparing' ? preparedCount : submittedCount;
    const total = Math.max(Number(email.email_count), completed);

    const sending: EmailSendingStatus['sending'] = {
      status,
      progress: {
        completed,
        total,
        estimated_seconds_remaining: this.#estimateSecondsRemaining({
          status,
          batches,
          completed,
          total,
          attemptStartedAt: email.updated_at,
        }),
      },
    };

    if (status === 'failed') {
      sending.failed_during = failedDuring;
    }

    return {
      id: email.id,
      sending,
    };
  }

  #estimateSecondsRemaining({
    status,
    batches,
    completed,
    total,
    attemptStartedAt,
  }: {
    status: SendingStatus;
    batches: Batch[];
    completed: number;
    total: number;
    attemptStartedAt: Date | string | null;
  }): number | null {
    if (status === 'submitted') {
      return 0;
    }
    if (status === 'failed') {
      return null;
    }

    const timestampField = status === 'preparing' ? 'createdAt' : 'updatedAt';
    const attemptStarted = attemptStartedAt ? new Date(attemptStartedAt).getTime() : null;
    const completedBatches = batches
      .filter((batch) => status === 'preparing' || batch.status === 'submitted')
      .map((batch) => ({
        recipientCount: batch.recipientCount,
        timestamp: new Date(batch[timestampField]).getTime(),
      }))
      .filter(
        (batch) =>
          Number.isFinite(batch.timestamp) &&
          batch.recipientCount > 0 &&
          (attemptStarted === null || batch.timestamp >= attemptStarted),
      )
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-ETA_BATCH_WINDOW);

    if (completedBatches.length < 2) {
      return null;
    }

    const firstTimestamp = completedBatches[0].timestamp;
    const lastTimestamp = completedBatches[completedBatches.length - 1].timestamp;
    const elapsedSeconds = (lastTimestamp - firstTimestamp) / 1000;
    if (elapsedSeconds <= 0) {
      return null;
    }

    const averageRecipientsPerBatch =
      completedBatches.reduce((sum, batch) => sum + batch.recipientCount, 0) /
      completedBatches.length;
    const recipientsPerSecond =
      (averageRecipientsPerBatch * (completedBatches.length - 1)) / elapsedSeconds;

    return Math.ceil(Math.max(total - completed, 0) / recipientsPerSecond);
  }
}
