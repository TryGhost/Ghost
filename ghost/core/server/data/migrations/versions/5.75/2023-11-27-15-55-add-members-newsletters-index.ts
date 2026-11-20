import logging from '@tryghost/logging';
import { createNonTransactionalMigration } from '../../utils';
import { addIndex, dropIndex } from '../../../schema/commands';

export default createNonTransactionalMigration(
  async function up(knex) {
    await addIndex('members_newsletters', ['newsletter_id', 'member_id'], knex);
  },
  async function down(knex) {
    try {
      await dropIndex('members_newsletters', ['newsletter_id', 'member_id'], knex);
    } catch (err: any) {
      if (err.code === 'ER_DROP_INDEX_FK') {
        logging.error({
          message:
            'Error dropping index over members_newsletters(newsletter_id, member_id), re-adding index for newsletter_id',
        });

        await addIndex('members_newsletters', ['newsletter_id'], knex);
        await dropIndex('members_newsletters', ['newsletter_id', 'member_id'], knex);
        return;
      }

      throw err;
    }
  },
);
