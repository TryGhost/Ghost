#!/usr/bin/env node

/**
 * Drops and recreates the in-development tables listed in
 * core/server/data/schema/in-development.ts so a local database picks up
 * changes to their definitions. Their data is discarded.
 */
try {
  require('tsx/cjs');
} catch (err) {
  if (err.code !== 'MODULE_NOT_FOUND') {
    throw err;
  }
}

require('../core/server/overrides');

const logging = require('@tryghost/logging');
const db = require('../core/server/data/db');
const { inDevelopment } = require('../core/server/data/schema');

(async () => {
  try {
    const tables = inDevelopment.getInDevelopmentTables();
    if (!tables.length) {
      logging.info('There are no in-development tables to rebuild');
      return;
    }

    await inDevelopment.rebuildInDevelopmentTables(db.knex);
  } catch (err) {
    logging.error(err);
    process.exitCode = 1;
  } finally {
    await db.knex.destroy();
  }
})();
