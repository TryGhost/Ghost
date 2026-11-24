import os from 'node:os';
import fs from 'node:fs';
import type { DatabaseOptions } from '#foundry/database';
import type { Logger } from '#kernel/logging';

const errors: typeof import('@tryghost/errors') = require('@tryghost/errors');

/** The part of Ghost's config these options are worked out from. */
interface Config {
  get(key: string): any;
}

/** What Ghost reads besides config. Handed in so tests can say what they are. */
export interface DatabaseOptionsContext {
  readonly logger: Pick<Logger, 'info'>;
  readonly env?: NodeJS.ProcessEnv;
  readonly platform?: NodeJS.Platform;
}

/**
 * Ghost's database options, worked out from Ghost's `database` config. Undefined when
 * config names no client, as some command-line tools load Ghost's config without one.
 *
 * Everything here is Ghost's choice, not the framework's: the `sqlite3` alias kept for
 * self-hosters' config files, fast SQLite for tests, the Windows temp path, and when a
 * process may stream local files into MySQL.
 */
export function databaseOptions(
  config: Config,
  { logger, env = process.env, platform = process.platform }: DatabaseOptionsContext,
): DatabaseOptions | undefined {
  // Read, never written: nconf shares nested subtrees by reference, so a write here
  // would leak into every later reader of `database`.
  const { client, connection = {}, ...knex } = config.get('database') ?? {};

  if (!client) {
    return undefined;
  }

  if (client === 'mysql' || client === 'mysql2') {
    return {
      client: 'mysql2',
      connection,
      knex,
      ...(infileStreamAllowed(env) && {
        infileStreamFactory: (path: string) => fs.createReadStream(path),
      }),
    };
  }

  if (client === 'sqlite3' || client === 'better-sqlite3') {
    if (client === 'sqlite3') {
      logger.info('Detected sqlite3 config, using better-sqlite3 as drop-in replacement');
    }

    let filename: string = connection.filename;
    // The default SQLite test config puts the file in /tmp, which Windows does not have
    if (platform === 'win32' && typeof filename === 'string' && filename.startsWith('/tmp')) {
      filename = filename.replace(/^\/tmp/, os.tmpdir());
      logger.info(`Ghost DB path: ${filename}`);
    }

    return {
      client: 'better-sqlite3',
      connection: { filename },
      knex,
      durability: String(config.get('env')).startsWith('testing') ? 'fast' : 'safe',
    };
  }

  throw new errors.IncorrectUsageError({
    message: `Unsupported database client: ${client}. Use mysql2 or better-sqlite3.`,
  });
}

/**
 * Whether this process streams local files into MySQL. Only scripts that need it set
 * `REQUIRE_INFILE_STREAM`, and only development, or an explicit `ALLOW_INFILE_STREAM`,
 * may have it.
 */
function infileStreamAllowed(env: NodeJS.ProcessEnv): boolean {
  if (!env.REQUIRE_INFILE_STREAM) {
    return false;
  }

  if (env.NODE_ENV === 'development' || env.ALLOW_INFILE_STREAM) {
    return true;
  }

  throw new errors.InternalServerError({
    message:
      'MySQL infile streaming is required to run the current process, but is not allowed. Run the script in development mode or set ALLOW_INFILE_STREAM=1.',
  });
}
