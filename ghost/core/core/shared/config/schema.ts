import type { OmitIndexSignature } from 'type-fest';
import { z } from 'zod';

/**
 * Keys every client shares. Loose, like `connection` in each variant, because
 * the whole subtree is handed to knex - ../../server/data/db/configure-knex.ts
 * spreads it, and MigratorConfig.js clones it for knex-migrator - so a key named
 * nowhere here, like `acquireConnectionTimeout`, is still a live knex option.
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

const mysqlDatabase = z.looseObject({
  client: z.literal('mysql2'),
  /**
   * Every key is optional: env/config.production.json supplies all four, but a
   * self-hoster on their own NODE_ENV supplies their own, and mysql2 has a
   * default for each - or connects by `socketPath` with no host at all.
   *
   * `filename` is never here: sanitizeDatabaseProperties deletes it.
   */
  connection: z
    .looseObject({
      host: z
        .string()
        .optional()
        .meta({ examples: ['127.0.0.1'] }),
      /** A number from env, ghost-cli and Ghost(Pro); a string only if hand-written so. */
      port: z
        .union([z.number(), z.string()])
        .optional()
        .meta({ examples: [3306] }),
      /**
       * `user`, `password` and `database` are strings or the driver throws:
       * mysql2 rejects a non-string `user` or `database` outright, and hashes
       * `password` with crypto, which refuses a number. That matters because
       * nconf parses env values as JSON - `database__connection__password=1234`
       * arrives as the number 1234 and fails here rather than at connect time.
       * `database__connection__password_FILE` is the way round it: ./secrets.ts
       * reads the file as a literal string.
       */
      user: z.string().optional(),
      /** An empty string in the shipped production default. */
      password: z.string().optional(),
      database: z.string().optional().meta({ description: 'The schema name.' }),
      /** Read by knex-migrator to create the database. configure-knex forces utf8mb4. */
      charset: z.string().optional(),
    })
    .meta({
      description: 'Passed to the mysql2 driver. Keys not listed here, like `ssl`, still reach it.',
    }),
  ...databaseBase,
});

const sqliteDatabase = z.looseObject({
  client: z.literal('better-sqlite3'),
  /**
   * `host`, `user`, `password` and `database` are never here:
   * sanitizeDatabaseProperties deletes them for every client but mysql2.
   */
  connection: z.looseObject({
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
  }),
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
 * 1. Validate, don't transform - for now. `z.object()` strips unknown keys and
 *    `z.coerce` rewrites values; either would silently change a live site's
 *    config, and the round-trip test in the unit suite fails if one does.
 *    Secrets are deliberately left unparsed by ./secrets.ts - a password of
 *    `01234` must stay a string. Deliberate transforms can come later, but they
 *    need `get()` rerouted by top-level key first, so a raw read of an unlisted
 *    sibling path can't disagree with a transformed one.
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
   * The deletion is not a stripping `z.object` waiting to happen: `connection`
   * is loose, because it goes to the driver whole and the driver's options are
   * not enumerable from here (`ssl`, `socketPath`, ...). Closing it would drop
   * live options a self-hoster sets. See SCHEMA.md.
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
