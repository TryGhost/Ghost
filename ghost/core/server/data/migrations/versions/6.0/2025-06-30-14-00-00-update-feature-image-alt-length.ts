import logging from '@tryghost/logging';
import { createNonTransactionalMigration } from '../../utils';
import DatabaseInfo from '@tryghost/database-info';

export default createNonTransactionalMigration(
  async function up(knex) {
    if (DatabaseInfo.isSQLite(knex)) {
      logging.warn(
        'Skipping migration for SQLite3 (fixed-length VARCHAR columns are not enforced)',
      );
      return;
    }

    logging.info('Changing posts_meta.feature_image_alt column from VARCHAR(191) to VARCHAR(2000)');
    await knex.schema.alterTable('posts_meta', function (table) {
      table.string('feature_image_alt', 2000).alter();
    });

    logging.info(
      'Changing post_revisions.feature_image_alt column from VARCHAR(191) to VARCHAR(2000)',
    );
    await knex.schema.alterTable('post_revisions', function (table) {
      table.string('feature_image_alt', 2000).alter();
    });
  },
  async function down() {
    logging.warn(
      'Reverting posts_meta.feature_image_alt and post_revisions.feature_image_alt column length increases is not supported (major version migrations are not reversible)',
    );
  },
);
