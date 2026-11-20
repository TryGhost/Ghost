import logging from '@tryghost/logging';
import { createNonTransactionalMigration } from '../../utils';
import { addIndex, dropIndex } from '../../../schema/commands';

export default createNonTransactionalMigration(
  async function up(knex) {
    await addIndex('members_subscribe_events', ['newsletter_id', 'created_at'], knex);
  },
  async function down(knex) {
    try {
      await dropIndex('members_subscribe_events', ['newsletter_id', 'created_at'], knex);
    } catch (err: any) {
      if (err.code === 'ER_DROP_INDEX_FK') {
        logging.error({
          message:
            'Error dropping index over members_subscribe_events(newsletter_id, created_at), re-adding index for newsletter_id',
        });

        await addIndex('members_subscribe_events', ['newsletter_id'], knex);
        await dropIndex('members_subscribe_events', ['newsletter_id', 'created_at'], knex);
        return;
      }

      throw err;
    }
  },
);
