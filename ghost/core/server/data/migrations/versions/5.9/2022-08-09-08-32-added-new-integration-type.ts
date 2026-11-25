import logging from '@tryghost/logging';
import { createTransactionalMigration } from '../../utils';

export default createTransactionalMigration(
  async function up(knex) {
    logging.info('Changing Ghost Explore Integration to type "core"');
    await knex('integrations')
      .where({
        name: 'Ghost Explore',
        slug: 'ghost-explore',
      })
      .update('type', 'core');
  },
  async function down(knex) {
    logging.info('Changing Ghost Explore Integration to type "builtin"');

    await knex('integrations')
      .where({
        name: 'Ghost Explore',
        slug: 'ghost-explore',
      })
      .update('type', 'builtin');
  },
);
