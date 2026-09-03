import { z } from 'zod';
import { DbCount } from '../../lib/db-types/count';
import { DbDate } from '../../lib/db-types/date';

export const StoredSendingStatus = z.enum(['pending', 'submitting', 'submitted', 'failed']);
export type StoredSendingStatus = z.infer<typeof StoredSendingStatus>;

// Projections of tables the Bookshelf models own, not full rows, so there is no knex table
// augmentation here: typing `emails` by these columns alone would mistype every other read.
export const DbEmailSendingRow = z.object({
  id: z.string(),
  status: StoredSendingStatus,
  email_count: DbCount,
  updated_at: DbDate.nullable(),
});
export type DbEmailSendingRow = z.output<typeof DbEmailSendingRow>;

export const DbBatchSendingRow = z.object({
  status: StoredSendingStatus,
  created_at: DbDate,
  updated_at: DbDate,
  recipient_count: DbCount,
});
export type DbBatchSendingRow = z.output<typeof DbBatchSendingRow>;
