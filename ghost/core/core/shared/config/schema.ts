import type { OmitIndexSignature } from 'type-fest';
import { z } from 'zod';

/**
 * Keys every client shares. The object they sit in stays loose, unlike
 * `connection`, because it is knex's own config rather than a driver's:
 * ../../server/data/db/configure-knex.ts spreads it into knex, and
 * MigratorConfig.js clones it for knex-migrator, so a key named nowhere here,
 * like `acquireConnectionTimeout`, is still a live knex option.
 */
const databaseBase = {
  /**
   * Passed to knex as-is for mysql2. For better-sqlite3, configure-knex
   * replaces it outright to install the pragma hook.
   */
  pool: z
    .looseObject({
      min: z.number().optional(),
      max: z.number().optional(),
    })
    .optional()
    .meta({
      description: "knex's connection pool. Ghost(Pro) sets `max` per site.",
      examples: [{ min: 0, max: 5 }],
    }),
  debug: z.boolean().optional().meta({ description: 'Log every query knex runs.' }),
  /**
   * Only meaningful for sqlite. Note the two defaults disagree: configure-knex
   * treats absent as true, knex-migrator as false.
   */
  useNullAsDefault: z.boolean().optional().meta({
    description: 'Insert NULL for a column a row omits. SQLite only.',
  }),
};

/**
 * The keys of mysql2's `ConnectionOptions` that `mysqlConnection` below
 * deliberately leaves out. The two together are exactly mysql2's own option
 * list, which is closed: anything else, it logs as invalid and ignores. That is
 * checked at compile time in test/unit/shared/config/database-schema.types.ts,
 * so a mysql2 upgrade that adds an option fails `test:types` instead of the new
 * option being silently stripped.
 */
export type MysqlConnectionKeysNotFromConfig =
  // Set by configure-knex on every connection, whatever config says.
  | 'decimalNumbers'
  | 'infileStreamFactory'
  // Also forced to 'Z' by configure-knex. Leaving it out keeps knex-migrator,
  // which would otherwise honour a configured value, on the same timezone.
  | 'timezone'
  // Take a function or a runtime object, which a config file, env var or
  // argument cannot express.
  | 'authPlugins'
  | 'authSwitchHandler'
  | 'Promise'
  | 'queryFormat'
  | 'stream'
  // mysql2's own pool, and its server mode. knex opens single connections with
  // createConnection and pools them itself, so these do nothing.
  | 'connectionLimit'
  | 'idleTimeout'
  | 'isServer'
  | 'maxIdle'
  | 'pool'
  | 'queueLimit'
  | 'waitForConnections';

/** One or more PEM strings. mysql2 also takes a Buffer, which config cannot express. */
const pem = z.union([z.string(), z.array(z.string())]);

/**
 * mysql2's `connection` options, as far as config can set them. Closed, like
 * `paths`, because the driver is: knex hands this object to
 * `mysql2.createConnection()`, which accepts a fixed set of keys - see
 * MysqlConnectionKeysNotFromConfig. So stripping an unknown key drops only what
 * the driver would have ignored anyway.
 *
 * Every key is optional: env/config.production.json supplies host, user,
 * password and database, but a self-hoster on their own NODE_ENV supplies their
 * own, and mysql2 has a default for each - or connects by `socketPath` with no
 * host at all.
 */
export const mysqlConnection = z.object({
  host: z
    .string()
    .optional()
    .meta({ examples: ['127.0.0.1'] }),
  /**
   * The one transform in the schema. A number from env, ghost-cli and
   * Ghost(Pro) alike, but a hand-written config may quote it, so a numeric
   * string is coerced. Safe where other transforms are not (see SCHEMA.md):
   * if a violation elsewhere means the raw tree is used, mysql2 accepts the
   * string anyway, and coercing a number is a no-op on every re-parse.
   *
   * Only a string of digits is coerced, not whatever `z.coerce.number()`
   * would take - that turns `true` into port 1 and `""` into 0.
   */
  port: z
    .union([z.number(), z.string().regex(/^\d+$/).transform(Number)])
    .pipe(z.number().int().min(1).max(65535))
    .optional()
    .meta({ examples: [3306] }),
  socketPath: z.string().optional(),
  localAddress: z.string().optional(),
  /** A connection URL, as an alternative to the keys above. */
  uri: z.string().optional(),
  /**
   * `user`, `password` and `database` are strings or the driver throws: mysql2
   * rejects a non-string `user` or `database` outright, and hashes `password`
   * with crypto, which refuses a number. That matters because nconf parses env
   * values as JSON - `database__connection__password=1234` arrives as the
   * number 1234 and fails here rather than at connect time.
   * `database__connection__password_FILE` is the way round it: ./secrets.ts
   * reads the file as a literal string.
   */
  user: z.string().optional(),
  /** An empty string in the shipped production default. */
  password: z.string().optional(),
  password1: z.string().optional(),
  password2: z.string().optional(),
  password3: z.string().optional(),
  passwordSha1: z.string().optional(),
  database: z.string().optional().meta({ description: 'The schema name.' }),
  /**
   * Read by knex-migrator to create the database. configure-knex forces
   * utf8mb4 on every runtime connection.
   */
  charset: z.string().optional(),
  charsetNumber: z.number().optional(),
  /** A string is the name of one of mysql2's built-in SSL profiles. */
  ssl: z
    .union([
      z.string(),
      z.object({
        ca: pem.optional(),
        cert: pem.optional(),
        key: pem.optional(),
        crl: pem.optional(),
        pfx: z.string().optional(),
        passphrase: z.string().optional(),
        ciphers: z.string().optional(),
        minVersion: z.string().optional(),
        maxVersion: z.string().optional(),
        rejectUnauthorized: z.boolean().optional(),
        verifyIdentity: z.boolean().optional(),
      }),
    ])
    .optional()
    .meta({ examples: [{ rejectUnauthorized: false }] }),
  insecureAuth: z.boolean().optional(),
  enableCleartextPlugin: z.boolean().optional(),
  connectTimeout: z.number().optional(),
  enableKeepAlive: z.boolean().optional(),
  keepAliveInitialDelay: z.number().optional(),
  compress: z.boolean().optional(),
  flags: z.array(z.string()).optional(),
  connectAttributes: z.record(z.string(), z.unknown()).optional(),
  maxPreparedStatements: z.number().optional(),
  multipleStatements: z.boolean().optional(),
  namedPlaceholders: z.boolean().optional(),
  stringifyObjects: z.boolean().optional(),
  /** Only the boolean form: the function form cannot come from config. */
  typeCast: z.boolean().optional(),
  supportBigNumbers: z.boolean().optional(),
  bigNumberStrings: z.boolean().optional(),
  dateStrings: z
    .union([z.boolean(), z.array(z.enum(['TIMESTAMP', 'DATETIME', 'DATE']))])
    .optional(),
  jsonStrings: z.boolean().optional(),
  nestTables: z.union([z.boolean(), z.string()]).optional(),
  rowsAsArray: z.boolean().optional(),
  disableEval: z.boolean().optional(),
  /** `true`, or the packet types to log. */
  debug: z.union([z.boolean(), z.array(z.string())]).optional(),
  trace: z.boolean().optional(),
  gracefulEnd: z.boolean().optional(),
});

/**
 * better-sqlite3's `connection`. Closed, and only `filename`, because that is
 * all that reaches the driver: knex's dialect opens it as
 * `new Database(connectionSettings.filename)` and reads nothing else.
 */
export const sqliteConnection = z.object({
  /**
   * Absolute by the time anything reads it - sanitizeDatabaseProperties
   * resolves a relative path against Ghost's install directory. Optional,
   * because better-sqlite3 opens a temporary database without one.
   */
  filename: z
    .string()
    .optional()
    .meta({
      description: 'The SQLite database file.',
      examples: ['/var/www/ghost/content/data/ghost.db'],
    }),
});

const mysqlDatabase = z.looseObject({
  client: z.literal('mysql2'),
  connection: mysqlConnection.meta({ description: 'Passed to the mysql2 driver.' }),
  ...databaseBase,
});

const sqliteDatabase = z.looseObject({
  client: z.literal('better-sqlite3'),
  connection: sqliteConnection,
  ...databaseBase,
});

/**
 * The validated shape of Ghost's config.
 *
 * A key is listed here once it has a real schema. `config.get()` then returns
 * that key's validated, deep-frozen value with a real type, at every existing
 * call site - no call-site change is needed. Keys that are not listed still come
 * through at runtime (the object is loose) and still read straight from nconf,
 * typed `any` as they always have been.
 *
 * Two rules keep this safe to grow against config that is already running:
 *
 * 1. Validate, don't transform. Outside development and test a violation
 *    hands the raw tree over instead of the parse, so a transform cannot be
 *    relied on to have run - only one whose raw input is still correct for its
 *    reader is safe, like `database:connection:port`. Unknown keys are a
 *    separate decision: the top level is loose, and a nested section is closed
 *    only where its readers are known. Secrets are deliberately left unparsed
 *    by ./secrets.ts - a password of `01234` must stay a string. See SCHEMA.md.
 * 2. Nothing here may be stricter than what the loader already enforced.
 *    Tightening beyond that is its own change, with its own release note.
 */
export const configSchema = z.looseObject({
  /**
   * Only as strict as the `checkUrlProtocol` assertion that has always run at
   * the end of the config load - anything this rejects, boot already rejected.
   */
  url: z
    .string()
    .regex(/^https?:\/\//i, {
      message: 'URL in config must be provided with protocol, eg. "http://my-ghost-blog.com"',
    })
    .meta({
      description: "The site's public URL, including protocol. A path is a subdirectory install.",
      examples: ['https://example.com', 'https://example.com/blog'],
    }),

  /**
   * Set by the loader from `getNodeEnv()`, so always a non-empty string. Not an
   * enum: Ghost runs under custom NODE_ENV values (`testing-mysql`, and whatever
   * an embedder picks) and rejecting those would be a boot failure.
   */
  env: z
    .string()
    .min(1)
    .meta({
      description:
        'The environment Ghost is running as, from NODE_ENV. Set by the loader, not by a config file.',
      examples: ['production', 'development'],
    }),

  /**
   * Where Ghost looks for its own code, its bundled assets and the site's
   * content.
   *
   * Every key here is supplied in-repo - ten by overrides.json, which no store
   * can override, and four by defaults.json - so all of them are present in any
   * loaded config. An env config narrows a value; none removes a key.
   *
   * The values are absolute by the time anything reads them:
   * `makePathsAbsolute` rewrites the whole subtree in ./loader.ts before
   * createConfig sees it. That ordering is load-bearing, and the transform still
   * lives in ./utils.ts rather than here - see SCHEMA.md.
   *
   * Closed, unlike the top level, because every reader is in this repo and reads
   * a key named here: no `paths:<key>` read anywhere in the monorepo is missing
   * from this list, none is built at runtime, and an adapter is handed only its
   * own config block, never the paths tree. So `z.object` strips nothing a real
   * boot produces - checked against every shipped env config - and in exchange
   * the type matches the runtime exactly, which makes
   * `config.get('paths').contentPatth` a compile error rather than `unknown`.
   *
   * The consequence to know: a key added to config but not to this list is
   * dropped, silently. Add both.
   */
  paths: z.object({
    appRoot: z.string().meta({ description: "Ghost's own install directory." }),
    corePath: z.string().meta({ description: "Ghost's core/ directory." }),
    contentPath: z.string().meta({
      description:
        "The site's content directory: themes, images, adapters, settings. The one path a self-hoster normally sets.",
      examples: ['/var/www/ghost/content'],
    }),
    assetSrc: z.string().meta({ description: 'Frontend asset sources.' }),
    adminAssets: z.string().meta({ description: 'Built Admin client assets.' }),
    helperTemplates: z.string().meta({ description: 'Templates for theme helpers.' }),
    defaultViews: z.string().meta({ description: "Ghost's own server-rendered views." }),
    defaultRouteSettings: z.string().meta({ description: 'The default routes.yaml.' }),
    internalAppPath: z.string().meta({ description: 'Bundled frontend apps.' }),
    internalAdaptersPath: z.string().meta({ description: 'Bundled adapter implementations.' }),
    /**
     * The one key here with no default: an escape hatch for Docker builds that
     * install adapters outside the bind-mounted content directory. Only a
     * self-hoster's own config supplies it, so it is optional.
     */
    installedAdaptersPath: z.string().optional().meta({
      description: 'Extra adapter lookup path, for images that install adapters outside content/.',
    }),
    migrationPath: z.string().meta({ description: 'Database migrations, read by knex-migrator.' }),
    publicFilePath: z.string().meta({ description: 'Files served at the site root.' }),
    fixtures: z.string().meta({ description: 'Fixture data loaded on a fresh install.' }),
    defaultSettings: z
      .string()
      .meta({ description: 'Default settings loaded on a fresh install.' }),
  }),

  /**
   * How Ghost connects to its database: a union on `client`, because the
   * connection keys that mean anything depend on it.
   *
   * `null` in defaults.json - the shape comes from env/*.json, a self-hoster's
   * config.<env>.json (written by ghost-cli) or Ghost(Pro)'s injected config and
   * `database__*` env vars. Required all the same: sanitizeDatabaseProperties
   * dereferences `database.connection` unconditionally, so a boot without one
   * has always thrown in the loader.
   *
   * Like `paths`, this describes the tree after ./utils.ts has run.
   * sanitizeDatabaseProperties still lives there, and does three things before
   * createConfig sees the tree:
   *
   * - renames `mysql` to `mysql2` and `sqlite3` to `better-sqlite3`, so only
   *   the two driver names are ever valid here
   * - deletes the connection keys the other client uses
   * - makes a sqlite `filename` absolute
   *
   * Each variant's `connection` is closed to exactly what its driver reads, so
   * parsing also drops the other client's keys - the deletion
   * sanitizeDatabaseProperties does by hand. It still has to run in the loader:
   * outside development and test a violation hands over the raw tree, and the
   * rename and path-absolutising are transforms either way. See SCHEMA.md.
   *
   * Only those two clients, because they are the only ones Ghost can run:
   * knex-migrator refuses anything @tryghost/database-info does not recognise.
   * Rejecting `pg` here is no stricter than boot already was.
   */
  database: z.discriminatedUnion('client', [mysqlDatabase, sqliteDatabase]).meta({
    description:
      'Database connection. `client` is `mysql` or `sqlite3` in config; Ghost normalises them to their driver names.',
  }),
});

export type ValidatedConfig = z.infer<typeof configSchema>;

/**
 * Drop the index signature `z.looseObject` adds, at every level.
 *
 * Without this, `keyof T & string` is `string`, the key-path union below
 * collapses to `string`, and nothing is typed at all - including, silently, the
 * paths that do have a schema.
 */
type Known<T> = OmitIndexSignature<T>;

type IsLeaf<T> = T extends object ? (T extends readonly unknown[] ? true : false) : true;

/** Every nconf-style key path the schema covers, e.g. `'paths:contentPath'`. */
export type ConfigPath<T = ValidatedConfig> = T extends object
  ? T extends readonly unknown[]
    ? never
    : {
        [K in keyof Known<T> & string]: IsLeaf<Known<T>[K]> extends true
          ? K
          : K | `${K}:${ConfigPath<Known<T>[K]>}`;
      }[keyof Known<T> & string]
  : never;

/** The value a key path resolves to, or `unknown` if the schema misses it. */
export type ConfigAt<
  P extends string,
  T = ValidatedConfig,
> = P extends `${infer Head}:${infer Rest}`
  ? Head extends keyof Known<T>
    ? ConfigAt<Rest, Known<T>[Head]>
    : unknown
  : P extends keyof Known<T>
    ? Known<T>[P]
    : unknown;
