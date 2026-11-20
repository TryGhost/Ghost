// For information on writing migrations, see https://www.notion.so/ghost/Database-migrations-eb5b78c435d741d2b34a582d57c24253

import { InternalServerError } from '@tryghost/errors';
import logging from '@tryghost/logging';
import security from '@tryghost/security';
import ObjectID from 'bson-objectid';
import { createTransactionalMigration } from '../../utils';

const MIGRATION_USER = 1;

const coreContentIntegration = {
  slug: 'ghost-core-content',
  name: 'Ghost Core Content API',
  description: 'Internal Content API integration for Admin access',
  type: 'core',
};

const addIntegrationContentKey = async (knex: any, integration: any) => {
  const message = `Adding "${integration.name}" integration content key`;

  const existingIntegration = await knex('integrations')
    .select('id')
    .where({
      slug: integration.slug,
    })
    .first();

  if (!existingIntegration) {
    throw new InternalServerError({
      message: `Could not find "${integration.name}" integration`,
    });
  }

  const existing = await knex('api_keys')
    .select('id')
    .where('integration_id', existingIntegration.id)
    .where('type', 'content')
    .first();

  if (existing?.id) {
    logging.warn(`Skipping ${message} - already exists`);
    return;
  }

  logging.info(message);

  await knex('api_keys').insert({
    id: new ObjectID().toHexString(),
    type: 'content',
    secret: security.secret.create('content'),
    role_id: null,
    integration_id: existingIntegration.id,
    created_at: knex.raw('current_timestamp'),
    created_by: MIGRATION_USER,
  });
};

const removeIntegrationContentKey = async (knex: any, integration: any) => {
  const message = `Removing "${integration.name}" integration content key`;

  const existingIntegration = await knex('integrations')
    .select('id')
    .where({
      slug: integration.slug,
    })
    .first();

  if (!existingIntegration?.id) {
    logging.warn(`Skipping ${message} - integration does not exist`);
    return;
  }

  const existing = await knex('api_keys')
    .select('id')
    .where({
      integration_id: existingIntegration.id,
      type: 'content',
    })
    .first();

  if (!existing?.id) {
    logging.warn(`Skipping ${message} - content key does not exist`);
    return;
  }

  logging.info(message);

  await knex('api_keys').where('id', existing.id).del();
};

export default createTransactionalMigration(
  async function up(knex) {
    await addIntegrationContentKey(knex, coreContentIntegration);
  },

  async function down(knex) {
    await removeIntegrationContentKey(knex, coreContentIntegration);
  },
);
