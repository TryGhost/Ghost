import logging from '@tryghost/logging';
import { createTransactionalMigration } from '../../utils';

// Rows added before the `changes` column hold no record of what they changed, so they're stored
// as changing nothing, which is what the history showed of them. Apps are behind a private labs
// flag, so these rows are test data.
export default createTransactionalMigration(
  async function up(knex) {
    // MySQL fills a new text column on existing rows with an empty string. Typed as the stored
    // text, as the service's table type only allows inserts.
    const updated = await knex<{ changes: string }>('app_installation_manifests')
      .where({ changes: '' })
      .update({ changes: '[]' });
    if (updated === 0) {
      logging.info('No app installation manifests needed their changes backfilled');
      return;
    }
    logging.info(`Stored no changes for ${updated} app installation manifests added before`);
  },
  async function down() {
    logging.info('Nothing to undo, as rolling back the changes column drops it');
  },
);
