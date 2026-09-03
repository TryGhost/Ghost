import type { Knex } from 'knex';
import { camelKeys } from '../../lib/case-keys';
import { DbCount } from '../../lib/db-types/count';
import { DbBatchSendingRow, DbEmailSendingRow } from './sending-status-schema';
import {
  openSending,
  submittedSending,
  type EmailSendingStatus,
  type SendingBatch,
} from './sending-status';

export type { EmailSendingStatus } from './sending-status';

export class SendingStatusService {
  #knex: Knex;

  constructor({ knex }: { knex: Knex }) {
    this.#knex = knex;
  }

  async statusFor(emailId: string): Promise<EmailSendingStatus | null> {
    const row = await this.#knex('emails')
      .select('id', 'status', 'email_count', 'updated_at')
      .where('id', emailId)
      .first();

    if (!row) {
      return null;
    }

    const email = DbEmailSendingRow.parse(row);
    const sending =
      email.status === 'submitted'
        ? submittedSending(await this.#recipientCountFor(emailId))
        : openSending(
            {
              status: email.status,
              recipientCount: email.email_count,
              // The sending job saves the email when it takes its status lock, so updated_at
              // stands in for the attempt start that Ghost does not record.
              attemptStartedAt: email.updated_at,
            },
            await this.#batchesFor(emailId),
          );

    return { id: email.id, sending };
  }

  async #batchesFor(emailId: string): Promise<SendingBatch[]> {
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

  async #recipientCountFor(emailId: string): Promise<number> {
    const [countRow] = await this.#knex('email_recipients')
      .count({ count: '*' })
      .where('email_id', emailId);

    return DbCount.parse(countRow.count);
  }
}
