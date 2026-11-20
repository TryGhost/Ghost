import type KnexMigrator from 'knex-migrator';
import { fixtureManager } from '../../schema/fixtures';

export const config: KnexMigrator.MigrationConfig = {
  transaction: true,
};

export const up = async function insertFixtures(options: KnexMigrator.MigrationContext) {
  return await fixtureManager.addAllFixtures(options);
};
