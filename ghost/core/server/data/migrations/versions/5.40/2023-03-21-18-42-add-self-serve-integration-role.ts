import logging from '@tryghost/logging';
import ObjectID from 'bson-objectid';
import { createTransactionalMigration } from '../../utils';

const MIGRATION_USER = 1;

export default createTransactionalMigration(
  async function up(knex) {
    logging.info('Creating "Self-Serve Migration Integration" role');
    const existingRole = await knex('roles')
      .where({
        name: 'Self-Serve Migration Integration',
      })
      .first();

    if (existingRole) {
      logging.warn('"Self-Serve Migration Integration" role already exists, skipping');
      return;
    }

    await knex('roles').insert({
      id: new ObjectID().toHexString(),
      name: 'Self-Serve Migration Integration',
      description: 'Core Integration for the Ghost Explore directory',
      created_by: MIGRATION_USER,
      created_at: knex.raw('current_timestamp'),
    });
  },
  async function down(knex) {
    logging.info('Deleting role "Self-Serve Migration Integration"');
    await knex('roles')
      .where({
        name: 'Self-Serve Migration Integration',
      })
      .del();
  },
);
