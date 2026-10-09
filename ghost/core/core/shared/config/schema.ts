import type { OmitIndexSignature } from 'type-fest';
import { z } from 'zod';

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
    /**
     * A quoted port is coerced. Safe to skip if the raw tree is used: mysql2
     * accepts a string too. Digits only, as `z.coerce` would take `true` as 1.
     */
    port: z
      .union([z.number(), z.string().regex(/^\d+$/).transform(Number)])
      .pipe(z.number().int().min(1).max(65535))
      .optional()
      .meta({ examples: [3306] }),
    /**
     * Strings, or mysql2 throws. An all-digit value from a plain env var is
     * parsed as a number - use `database__connection__password_FILE`.
     */
    user: z.string().optional(),
    password: z.string().optional(),
    database: z.string().optional(),
    /** Read by knex-migrator to create the database. */
    charset: z.string().optional(),
    /** A mysql2 SSL profile name, or TLS options. */
    ssl: z.union([z.string(), z.looseObject({})]).optional(),
  })
  .meta({
    description:
      'Passed to the mysql2 driver. See https://sidorares.github.io/node-mysql2/docs/api-and-configurations',
  });

/**
 * Closed: knex hands better-sqlite3 only `filename`. Made absolute by
 * sanitizeDatabaseProperties.
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
  client: z.literal('mysql2'),
  connection: mysqlConnection,
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
 * 1. Validate, don't transform. A failed parse hands over the raw tree, so a
 *    transform is only safe if its raw input still works, like
 *    `database:connection:port`. See SCHEMA.md.
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
   * A union on `client`. Describes the tree after sanitizeDatabaseProperties
   * in ./utils.ts, which renames `mysql`/`sqlite3` to their driver names, drops
   * the other client's connection keys and makes a sqlite path absolute. It
   * stays in the loader: the raw tree is used when validation fails.
   *
   * Required, as that function has always dereferenced it. Only two clients,
   * as knex-migrator refuses any other.
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
