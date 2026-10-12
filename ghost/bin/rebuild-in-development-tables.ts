#!/usr/bin/env node

// Drops and recreates the in-development tables listed in
// core/server/data/schema/in-development.ts so a local database picks up
// changes to their definitions. Their data is discarded.

import '../core/server/overrides';
import logging from '@tryghost/logging';
import db from '../core/server/data/db';
import { rebuildInDevelopmentTables } from '../core/server/data/schema/in-development';

async function main() {
  try {
    await rebuildInDevelopmentTables(db.knex);
  } catch (err) {
    logging.error(err);
    process.exitCode = 1;
  } finally {
    await db.knex.destroy();
  }
}

main();
