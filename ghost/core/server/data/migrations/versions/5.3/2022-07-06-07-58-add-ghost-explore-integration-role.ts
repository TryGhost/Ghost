import logging from '@tryghost/logging';
import ObjectID from 'bson-objectid';
import { createTransactionalMigration } from '../../utils';

const MIGRATION_USER = 1;

export default createTransactionalMigration(
  async function up(knex) {
    logging.info('Creating "Ghost Explore Integration" role');
    const existingRole = await knex('roles')
      .where({
        name: 'Ghost Explore Integration',
      })
      .first();

    if (existingRole) {
      logging.warn('"Ghost Explore Integration" role already exists, skipping');
      return;
    }

    await knex('roles').insert({
      id: new ObjectID().toHexString(),
      name: 'Ghost Explore Integration',
      description: 'Internal Integration for the Ghost Explore directory',
      created_by: MIGRATION_USER,
      created_at: knex.raw('current_timestamp'),
    });
  },
  async function down(knex) {
    logging.info('Deleting role "Ghost Explore Integration"');
    await knex('roles')
      .where({
        name: 'Ghost Explore Integration',
      })
      .del();
  },
);
