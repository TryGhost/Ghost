import logging from '@tryghost/logging';
import { createTransactionalMigration } from '../../utils';

export default createTransactionalMigration(
  async function up(connection) {
    const affectedRows = await connection('newsletters')
      .update({
        feedback_enabled: false,
      })
      .where('feedback_enabled', true);

    if (affectedRows > 0) {
      // Only log if this site was affected by the issue.
      logging.info(`Disabled feedback for ${affectedRows} newsletter(s)`);
    }
  },
  async function down() {
    // no-op: we don't need to change it back
  },
);
