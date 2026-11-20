import { InternalServerError } from '@tryghost/errors';
import logging from '@tryghost/logging';
import security from '@tryghost/security';
import ObjectID from 'bson-objectid';
import { createTransactionalMigration } from '../../utils';

export default createTransactionalMigration(
  async function up(knex) {
    logging.info('Adding Admin API key for Transistor integration');

    const integration = await knex('integrations')
      .where({
        slug: 'transistor',
        type: 'builtin',
      })
      .first();

    if (!integration) {
      throw new InternalServerError({
        message: 'Could not find Transistor integration',
      });
    }

    const role = await knex('roles')
      .where({
        name: 'Admin Integration',
      })
      .first();

    if (!role) {
      throw new InternalServerError({
        message: 'Could not find Admin Integration role',
      });
    }

    const existingKey = await knex('api_keys')
      .where({
        integration_id: integration.id,
        type: 'admin',
      })
      .first();

    if (existingKey) {
      logging.warn('Admin API key already exists for Transistor integration');
      return;
    }

    await knex('api_keys').insert({
      id: new ObjectID().toHexString(),
      type: 'admin',
      secret: security.secret.create('admin'),
      role_id: role.id,
      integration_id: integration.id,
      created_at: knex.raw('current_timestamp'),
    });
  },
  async function down(knex) {
    logging.info('Removing Transistor API key');

    const integration = await knex('integrations')
      .where({
        slug: 'transistor',
        type: 'builtin',
      })
      .first();

    if (!integration) {
      logging.warn('Could not find Transistor integration');
      return;
    }

    await knex('api_keys')
      .where({
        integration_id: integration.id,
        type: 'admin',
      })
      .del();
  },
);
