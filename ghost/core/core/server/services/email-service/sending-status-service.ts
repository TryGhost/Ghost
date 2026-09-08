import type { Knex } from 'knex';
import { camelKeys } from '../../lib/case-keys';
import { DbBatchSendingRow, DbEmailSendingRow } from './sending-status-schema';
import { buildSendingStatus, type EmailSendingStatus, type SendingBatch } from './sending-status';

export type { EmailSendingStatus } from './sending-status';

export class SendingStatusService {
  #knex: Knex;

  constructor({ knex }: { knex: Knex }) {
    this.#knex = knex;
  }

  async statusFor(emailId: string): Promise<EmailSendingStatus | null> {
    const row = await this.#knex('emails')
      .select('id', 'status', 'email_count', 'preflight_email_count', 'updated_at')
      .where('id', emailId)
      .first();

    if (!row) {
      return null;
    }

    const email = DbEmailSendingRow.parse(row);
    // Completion persists the verified submitted count (legacy sends retain their
    // intended count), so finished sends need no batch or recipient aggregation.
    const batches =
      email.status === 'submitted'
        ? []
        : await this.#batchesFor(emailId, email.preflight_email_count !== null);

    return {
      id: email.id,
      sending: buildSendingStatus(
        {
          status: email.status,
          recipientCount: email.email_count,
          // The sending job saves the email when it takes its status lock, so updated_at
          // stands in for the attempt start that Ghost does not record.
          attemptStartedAt: email.updated_at,
        },
        batches,
      ),
    };
  }

  async #batchesFor(emailId: string, recipientAccounting: boolean): Promise<SendingBatch[]> {
    if (recipientAccounting) {
      const rows = await this.#knex('email_batches')
        .select('status', 'created_at', 'updated_at')
        // Corrupt or transitional null counts must not hide the failed-send status.
        // Verification rejects them; this read-only projection gives no credit for unknown rows.
        .select(this.#knex.raw('COALESCE(recipient_count, 0) AS recipient_count'))
        // Both missing counts identify preparation-only deployments. A partially
        // missing pair is invalid and earns no verified submission progress.
        .select(
          this.#knex.raw(
            `CASE
              WHEN submitted_count IS NULL AND submission_excluded_count IS NULL
              THEN COALESCE(recipient_count, 0)
              ELSE COALESCE(submitted_count + submission_excluded_count, 0)
            END AS accounted_recipient_count`,
          ),
        )
        .where('email_id', emailId);
      return rows.map((batchRow) => camelKeys(DbBatchSendingRow.parse(batchRow)));
    }
    // Correlated per-batch count stays on the batch_id index; grouping recipients by email_id scans every recipient row.
    const recipientCount = this.#knex('email_recipients as recipient')
      .count('*')
      .whereRaw('recipient.batch_id = batch.id');
    const rows = await this.#knex('email_batches as batch')
      .select('batch.status', 'batch.created_at', 'batch.updated_at')
      .select(recipientCount.as('recipient_count'))
      .where('batch.email_id', emailId);

    return rows.map((batchRow) => camelKeys(DbBatchSendingRow.parse(batchRow)));
  }
}
