#!/usr/bin/env node
import { z } from 'zod';
// @ts-expect-error This module lacks type definitions.
import prettyCli from '@tryghost/pretty-cli';

const logging = prettyCli.ui.log;
const options = z.object({
  'base-data-pack': z.string().default(''),
  'clear-database': z.boolean().default(false),
  tables: z.string().optional(),
  quantities: z.string().optional(),
  'with-default': z.boolean().default(false),
  'print-dependencies': z.boolean().default(false),
  seed: z.union([z.number(), z.nan(), z.literal('')]).optional(),
});

async function main() {
  const env = process.env.NODE_ENV || 'development';
  process.env.NODE_ENV = env;
  logging.warn(`Node environment: ${env}`);
  if (!['development', 'local', 'staging', 'production'].includes(env)) {
    logging.fatal(`Command DataGeneratorCommand is not permitted in ${env}`);
    process.exitCode = 2;
    return;
  }
  const cli = prettyCli.Api.get({ name: 'pnpm gx data generate' })
    .help('-h, --help')
    .version('-v, --version')
    .style(prettyCli.styles)
    .preface('Generates random data to populate the database for development & testing')
    .epilogue(' ')
    .strict();
  cli.option('--base-data-pack', {
    type: 'string',
    defaultValue: '',
    desc: 'Base data pack file location, imported instead of random content',
  });
  cli.option('--clear-database', {
    type: 'boolean',
    defaultValue: false,
    desc: 'Clear all entries in the database before importing',
  });
  cli.option('--tables', {
    type: 'string',
    desc: 'Only import the specified list of tables, where quantities can be specified by appending a colon followed by the quantity for each table. Example: --tables=members:1000,posts,tags,members_login_events',
  });
  cli.option('--quantities', {
    type: 'string',
    desc: 'Allows you to specify different default quantities for specific tables without affecting the tables that are generated. Example: --quantities=members:1000',
  });
  cli.option('--with-default', {
    type: 'boolean',
    defaultValue: false,
    desc: 'Include default tables as well as those specified (simply override quantities)',
  });
  cli.option('--print-dependencies', {
    type: 'boolean',
    defaultValue: false,
    desc: 'Prints the dependency tree for the data generator and exits',
  });
  cli.option('--seed', {
    type: 'number',
    defaultValue: '',
    desc: 'Use a seed to reliably generate the same data on multiple runs (timestamps will still change a little bit to remain up to date)',
  });
  const argv = options.parse(await cli.parseAndExit());
  // If we can't stream, throw an error while creating the connection
  process.env.REQUIRE_INFILE_STREAM = '1';

  const tables = (argv.tables ? argv.tables.split(',') : []).map((table) => ({
    name: table.split(':')[0],
    quantity: parseInt(table.split(':')[1]) || undefined,
  }));

  const quantities: Record<string, number> = {};

  if (argv.quantities) {
    for (const quantity of argv.quantities.split(',')) {
      const [table, amount] = quantity.split(':');

      if (amount === undefined || !isFinite(parseInt(amount))) {
        logging.fatal(`Missing quantity for table ${table}`);
        return;
      }

      quantities[table] = parseInt(amount);
    }
  }

  const { knex } = await import('../../ghost/core/server/data/db');
  try {
    const { default: config } = await import('../../ghost/core/shared/config');
    // @ts-expect-error The existing JavaScript schema has no type declarations.
    const { default: schema } = await import('../../ghost/core/server/data/schema');
    const { default: DataGenerator } =
      // @ts-expect-error The existing JavaScript generator has no type declarations.
      await import('../../ghost/core/server/data/seeders/data-generator');
    const schemaTables = schema.tables;

    const dataGenerator = new DataGenerator({
      baseDataPack: argv['base-data-pack'],
      knex,
      logger: {
        log: logging,
        ok: logging.ok,
        info: logging.info,
        warn: logging.warn,
        error: logging.error,
        fatal: logging.fatal,
        debug: logging.debug,
      },
      baseUrl: config.getSiteUrl(),
      clearDatabase: argv['clear-database'],
      tables,
      schemaTables,
      withDefault: argv['with-default'],
      printDependencies: argv['print-dependencies'],
      quantities,
      seed: argv.seed || undefined,
    });
    try {
      await dataGenerator.importData();
    } catch (error) {
      logging.fatal('Failed while generating data: ', error);
    }
  } finally {
    await knex.destroy();
  }
}

main().catch((error: unknown) => {
  logging.fatal(error);
  process.exitCode = 1;
});
