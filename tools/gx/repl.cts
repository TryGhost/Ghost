#!/usr/bin/env node
import { start } from 'node:repl';
import chalk from 'chalk';
import { z } from 'zod';
// @ts-expect-error This module lacks type definitions.
import prettyCli from '@tryghost/pretty-cli';

const logging = prettyCli.ui.log;

async function main() {
  const env = process.env.NODE_ENV || 'development';
  process.env.NODE_ENV = env;
  logging.warn(`Node environment: ${chalk.bold(env)}`);
  if (!['development', 'local'].includes(env)) {
    logging.fatal(`Command REPL is not permitted in ${env}`);
    process.exitCode = 2;
    return;
  }
  const cli = prettyCli.Api.get({ name: 'pnpm gx repl' })
    .help('-h, --help')
    .version('-v, --version')
    .style(prettyCli.styles)
    .preface('Launches a REPL environment with access to a configured db instance and models')
    .epilogue(' ')
    .strict()
    .string('--color', { defaultValue: 'yellow', hidden: true });
  const argv = z.object({ color: z.string().default('yellow') }).parse(await cli.parseAndExit());
  const color = Reflect.get(chalk, argv.color);
  if (typeof color !== 'function') {
    throw new Error(`Unknown REPL color: ${argv.color}`);
  }
  logging.debug(Reflect.apply(color, chalk, ['== Ghost development REPL ==']));
  logging.info(`a knex database instance is available as ${chalk.magenta('knex')}`);
  logging.info(`bookshelf models are available as ${chalk.magenta('models')}`);

  const { default: db } = await import('../../ghost/core/server/data/db');
  const knex = db.knex;
  try {
    const { default: models } =
      // @ts-expect-error Core's JavaScript models have no type declarations.
      await import('../../ghost/core/server/models');
    function initializeContext(context: Record<string, unknown>) {
      context.models = models;
      context.m = models;
      context.knex = knex;
      context.k = knex;
    }
    const shell = start('> ');
    initializeContext(shell.context);
    shell.on('reset', initializeContext);
    await new Promise<void>((resolve, reject) => {
      shell.once('exit', resolve);
      shell.once('error', reject);
    });
  } finally {
    await knex.destroy();
  }
}

main().catch((error: unknown) => {
  logging.error(error);
  process.exitCode = 1;
});
