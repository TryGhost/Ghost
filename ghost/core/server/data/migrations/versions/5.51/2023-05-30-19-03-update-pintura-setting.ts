import logging from '@tryghost/logging';
import { createTransactionalMigration } from '../../utils';

export default createTransactionalMigration(
  async function up(knex) {
    logging.info('Updating setting: "pintura" to "true"');
    await knex('settings')
      .where({
        key: 'pintura',
      })
      .update({
        value: 'true',
      });
  },

  async function down() {
    // no-op: this is a one way migration to set the default value for pintura integration
  },
);
