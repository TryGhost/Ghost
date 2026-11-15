import { z } from 'zod';
import { tcpPort } from './primitives';

/**
 * Shared by both clients. Loose, because configure-knex spreads it into knex,
 * so unlisted keys like `acquireConnectionTimeout` still work.
 */
const databaseBase = {
  /** Replaced by configure-knex for better-sqlite3. */
  pool: z
    .looseObject({
      min: z.number().optional(),
      max: z.number().optional(),
    })
    .optional()
    .meta({ description: "knex's connection pool.", examples: [{ min: 0, max: 5 }] }),
  debug: z.boolean().optional().meta({ description: 'Log every query knex runs.' }),
  useNullAsDefault: z.boolean().optional().meta({
    description: 'Insert NULL for a column a row omits. SQLite only.',
  }),
};

/**
 * Only the common keys are validated. Loose, so any other mysql2 option still
 * reaches the driver.
 */
const mysqlConnection = z
  .looseObject({
    host: z
      .string()
      .optional()
      .meta({ examples: ['127.0.0.1'] }),
    /** Safe to skip if the raw tree is used: mysql2 accepts a string too. */
    port: tcpPort.optional().meta({ examples: [3306] }),
    /**
     * Strings, or mysql2 throws. An all-digit value from a plain env var is
     * parsed as a number - use `database__connection__password_FILE`.
     */
    user: z.string().optional(),
    password: z.string().optional(),
    database: z.string().optional(),
    /** Read by knex-migrator to create the database. */
    charset: z.string().optional(),
    /** A mysql2 SSL profile name, TLS options, or `false` to disable. */
    ssl: z.union([z.literal(false), z.string(), z.looseObject({})]).optional(),
  })
  .meta({
    description:
      'Passed to the mysql2 driver. See https://sidorares.github.io/node-mysql2/docs/api-and-configurations',
  });

/**
 * Closed: knex hands better-sqlite3 only `filename`. Absolute when it comes
 * from Ghost's bundled config; a user-supplied relative path stays relative.
 */
const sqliteConnection = z.object({
  filename: z
    .string()
    .optional()
    .meta({
      description: 'The SQLite database file.',
      examples: ['/var/www/ghost/content/data/ghost.db'],
    }),
});

const mysqlDatabase = z.looseObject({
  client: z.enum(['mysql', 'mysql2']).transform(() => 'mysql2' as const),
  // a filename left over from sqlite config would reach mysql2, which warns on it
  connection: mysqlConnection.transform(({ filename: _filename, ...connection }) => connection),
  ...databaseBase,
});

const sqliteDatabase = z.looseObject({
  client: z.enum(['sqlite3', 'better-sqlite3']).transform(() => 'better-sqlite3' as const),
  connection: sqliteConnection,
  ...databaseBase,
});

/**
 * A union on `client`. Each option renames its config alias to the driver name
 * and drops the other client's connection keys, which a sqlite default
 * overridden with mysql would otherwise carry over.
 *
 * Required, with its connection, as knex-migrator and both drivers
 * dereference them. Only two clients, as knex-migrator refuses any other.
 */
export const database = z.discriminatedUnion('client', [mysqlDatabase, sqliteDatabase]).meta({
  description:
    'Database connection. `mysql` and `sqlite3` are accepted as aliases for their driver names.',
});
