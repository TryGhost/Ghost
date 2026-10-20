#!/usr/bin/env node
import chalk from 'chalk';
import { DateTime } from 'luxon';
import { z } from 'zod';
// @ts-expect-error This module lacks type definitions.
import prettyCli from '@tryghost/pretty-cli';
// @ts-expect-error This module lacks type definitions.
import inquirer from 'inquirer';
// @ts-expect-error This module lacks type definitions.
import progress from 'cli-progress';

const logging = prettyCli.ui.log;
// Use member logins as the basis for the default offset.
const datum = { table: 'members_login_events', column: 'created_at' };
const helpText = `Updates the Ghost db and shifts all dates up to present day.
By default the offset is based on the date of the last member login.\n
${chalk.red('warning')} This is a destructive operation for testing purposes only. DO NOT run it against a database you care about.`;
const schemaShape = z.record(
  z.string(),
  z.record(z.string(), z.object({ type: z.string().optional() })),
);

async function main() {
  const env = process.env.NODE_ENV || 'development';
  process.env.NODE_ENV = env;
  logging.warn(`Node environment: ${chalk.bold(env)}`);
  if (!['development', 'local'].includes(env)) {
    logging.fatal(`Command TimeTravel is not permitted in ${env}`);
    process.exitCode = 2;
    return;
  }
  const cli = prettyCli.Api.get({ name: 'pnpm gx data shift-dates' })
    .help('-h, --help')
    .version('-v, --version')
    .style(prettyCli.styles)
    .preface(helpText)
    .epilogue(' ')
    .strict()
    .number('--offset', { desc: 'Specify a date offset (in days)' })
    .boolean('--force', { desc: 'Continue without confirmation' });
  const argv = z
    .object({
      offset: z.union([z.number(), z.nan()]).optional(),
      force: z.boolean().optional(),
    })
    .parse(await cli.parseAndExit());

  // Load Core only after parsing: config loading otherwise intercepts --help.
  const { default: db } = await import('../../ghost/core/server/data/db/index.js');
  const knex = db.knex;
  try {
    const { default: schema } =
      // @ts-expect-error Core's JavaScript schema has no type declarations.
      await import('../../ghost/core/server/data/schema/index.js');
    if (!argv.offset) {
      const point = await knex(datum.table)
        .max(datum.column, { as: datum.column })
        .first<{ created_at: Date | null }>();
      if (!point?.created_at) {
        logging.error('No data to use as baseline. Use --offset instead');
        return;
      }
      argv.offset = Math.floor(
        DateTime.utc().diff(DateTime.fromJSDate(point.created_at), 'days').days,
      );
    }
    const dateOffset = argv.offset;
    logging.info(`Timetravel will use an offset of +${dateOffset} days`);
    logging.warn('This is a destructive command that will modify your database.');
    const confirm =
      argv.force ||
      z.object({ value: z.boolean() }).parse(
        await inquirer.prompt([
          {
            message: 'Are you sure you want to continue?',
            type: 'confirm',
            default: false,
            name: 'value',
          },
        ]),
      ).value;
    if (!confirm) {
      logging.warn('Aborting');
      process.exitCode = 1;
      return;
    }

    const dateTimeFields: Record<string, string[]> = {};
    for (const [table, columns] of Object.entries(schemaShape.parse(schema.tables))) {
      const fields = Object.entries(columns)
        .filter(([, spec]) => spec.type === 'dateTime')
        .map(([name]) => name);
      if (fields.length > 0) {
        dateTimeFields[table] = fields;
      }
    }
    const totalFields = Object.values(dateTimeFields).reduce(
      (total, fields) => total + fields.length,
      0,
    );
    const bar = new progress.Bar({
      format: `|${chalk.cyan('{bar}')}| {percentage}% | {value}/{total} {status}`,
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true,
      clearOnComplete: true,
      stopOnComplete: true,
      forceRedraw: true,
    });
    bar.start(totalFields, 0, { status: '' });
    try {
      await knex.transaction(async (transaction) => {
        for (const [table, columns] of Object.entries(dateTimeFields)) {
          for (const column of columns) {
            bar.update({ status: `Updating ${table}.${column}` });
            await transaction(table).update(
              column,
              transaction.raw(`DATE_ADD(${column}, interval ${dateOffset} day)`),
            );
            bar.increment();
          }
        }
        logging.info(`Updated ${totalFields} fields`);
      });
    } finally {
      bar.stop();
    }
  } finally {
    await knex.destroy();
  }
}

main().catch((error: unknown) => {
  logging.error(error);
  process.exitCode = 1;
});
