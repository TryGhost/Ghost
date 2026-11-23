import ObjectID from 'bson-objectid';
import logging from '@tryghost/logging';

import { createTransactionalMigration } from '../../utils';

export default createTransactionalMigration(
  async function up(knex) {
    const members = await knex('members').select('id', 'created_at');

    if (members.length === 0) {
      logging.warn(`Skipping migration because no members found`);
      return;
    }

    const toInsert = members.map((member) => {
      return {
        id: ObjectID().toHexString(),
        member_id: member.id,
        created_at: member.created_at,
        source: 'member',
      };
    });

    logging.info(`Inserting ${toInsert.length} members created events`);
    await knex.batchInsert('members_created_events', toInsert);
  },
  async function down(knex) {
    logging.info(`Clearing all members created events`);
    await knex('members_created_events').del();
  },
);
