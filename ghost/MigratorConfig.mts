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
import config from './core/shared/config/index.js';
import { configure } from './core/server/data/db/configure-knex.js';

/**
 * knex-migrator can be used via CLI or within the application
 * when using the CLI, we need to ensure that our global overrides are triggered
 */
import './core/server/overrides.js';

export default defineConfig({
  currentVersion: ghostVersion.safe,
  // The same knex options Ghost connects with, so migrations run with the app's client settings.
  database: configure(config.get('database')),
  migrationPath: config.get('paths:migrationPath'),
});
