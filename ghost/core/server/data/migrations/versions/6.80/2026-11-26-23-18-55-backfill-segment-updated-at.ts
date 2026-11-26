import logging from '@tryghost/logging';
import { createTransactionalMigration } from '../../utils';

// A segment's `updated_at` was null until the segment was first renamed. It is now the time the
// segment was added until then, so that it is never null and a segment has been edited when it is
// later than `created_at`. This gives each segment that has never been renamed its `created_at`.
// A segment that has a time keeps it, so running the migration again changes nothing.

const TABLE = 'segments';

/** A row of the segments table as this migration reads and writes it. */
type StoredSegment = { id: string; created_at: Date | string; updated_at: Date | string | null };

export default createTransactionalMigration(
  async function up(knex) {
    const unedited = await knex<StoredSegment>(TABLE)
      .whereNull('updated_at')
      .update({ updated_at: knex.ref('created_at') });
    if (unedited === 0) {
      logging.info('Every segment has an updated_at, so none are set');
      return;
    }
    logging.info(`Set updated_at to created_at for ${unedited} segments never renamed`);
  },
  async function down() {
    logging.info('Keeping segment updated_at times until the column is made nullable');
  },
);
