#!/usr/bin/env node

// Generates data into the configured database from an installed Ghost tree.
// Same options as `pnpm gx data generate`, which contributors use in a checkout.

import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    'base-data-pack': { type: 'string', default: '' },
    'clear-database': { type: 'boolean', default: false },
    tables: { type: 'string', default: '' },
    quantities: { type: 'string', default: '' },
    'with-default': { type: 'boolean', default: false },
    'print-dependencies': { type: 'boolean', default: false },
    seed: { type: 'string' },
  },
});

const pairs = (list: string) =>
  list
    .split(',')
    .filter(Boolean)
    .map((entry) => {
      const [name = '', quantity = ''] = entry.split(':');
      return { name, quantity: quantity ? parseInt(quantity) : undefined };
    });

async function main() {
  // Fail while creating the connection if MySQL can't stream LOAD DATA
  process.env.REQUIRE_INFILE_STREAM = '1';

  const config = require('../core/shared/config');
  const { knex } = require('../core/server/data/db');
  const { tables: schemaTables } = require('../core/server/data/schema');
  const DataGenerator = require('../core/server/data/seeders/data-generator');

  try {
    await new DataGenerator({
      baseDataPack: values['base-data-pack'],
      knex,
      logger: console,
      baseUrl: config.getSiteUrl(),
      clearDatabase: values['clear-database'],
      tables: pairs(values.tables),
      schemaTables,
      withDefault: values['with-default'],
      printDependencies: values['print-dependencies'],
      quantities: Object.fromEntries(
        pairs(values.quantities).map(({ name, quantity }) => [name, quantity]),
      ),
      seed: values.seed ? parseInt(values.seed) : undefined,
    }).importData();
  } finally {
    await knex.destroy();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
