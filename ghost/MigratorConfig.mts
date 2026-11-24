/**
 * knex-migrator requires this exact filename in the project root, therefore, linter naming rules are disabled here.
 * @see https://github.com/TryGhost/knex-migrator
 *
 * Unbuilt, this needs tsx preloaded (the root knex-migrator scripts set
 * NODE_OPTIONS), which maps the `.js` imports to their `.ts` sources. Built
 * trees load tsc's ESM MigratorConfig.mjs.
 */
import { defineConfig } from 'knex-migrator';
import ghostVersion from '@tryghost/version';
import logging from '@tryghost/logging';
import { knexConfig } from '#foundry/database';
import config from './core/shared/config/index.js';
import { databaseOptions } from './bootstrap/database-options.js';

/**
 * knex-migrator can be used via CLI or within the application
 * when using the CLI, we need to ensure that our global overrides are triggered
 */
import './core/server/overrides.js';

const options = databaseOptions(config, { logger: logging });

if (!options) {
  throw new Error('knex-migrator needs a database: config names no database client.');
}

export default defineConfig({
  currentVersion: ghostVersion.safe,
  // Built by the framework from Ghost's options, as Ghost's own handle is, so migrations
  // run with the app's client settings. knex-migrator builds its own knex from it.
  database: knexConfig(options),
  migrationPath: config.get('paths:migrationPath'),
});
