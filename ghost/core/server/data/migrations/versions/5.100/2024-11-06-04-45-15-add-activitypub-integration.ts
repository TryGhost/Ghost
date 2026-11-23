import logging from '@tryghost/logging';
import { createTransactionalMigration } from '../../utils';
import ObjectID from 'bson-objectid';

const MIGRATION_USER = 1;

export default createTransactionalMigration(
  async function up(knex) {
    logging.info('Adding Ghost ActivityPub integration');
    const existing = await knex
      .select('id')
      .from('integrations')
      .where('slug', '=', 'ghost-activitypub')
      .andWhere('type', '=', 'internal')
      .first();

    if (existing) {
      logging.warn('Found existing Ghost ActivityPub integration');
      return;
    }

    await knex
      .insert({
        id: new ObjectID().toHexString(),
        type: 'internal',
        slug: 'ghost-activitypub',
        name: 'Ghost ActivityPub',
        description: 'Internal Integration for ActivityPub',
        created_at: knex.raw('current_timestamp'),
        created_by: MIGRATION_USER,
      })
      .into('integrations');
  },
  async function down(knex) {
    logging.info('Removing Ghost ActivityPub integration');
    await knex
      .del()
      .from('integrations')
      .where('slug', '=', 'ghost-activitypub')
      .andWhere('type', '=', 'internal');
  },
);
