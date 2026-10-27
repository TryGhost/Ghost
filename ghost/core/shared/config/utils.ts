import path from 'node:path';
import fs from 'node:fs';
import * as jsonc from 'jsonc-parser';
import type { Provider, IFormat } from 'nconf';

type Tree = Record<string, unknown>;

function isObject(value: unknown): value is Tree {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const packageRoot = path.join(__dirname, '../../..');

/**
 * Resolve every relative path in `paths` against the package root, in place.
 *
 * A value counts as a path if it contains a / or \ or is ".".
 */
function makePathsAbsolute(paths: unknown): void {
  if (!isObject(paths)) {
    return;
  }

  for (const [key, value] of Object.entries(paths)) {
    if (isObject(value)) {
      makePathsAbsolute(value);
    } else if (
      typeof value === 'string' &&
      (value.match(/\/+|\\+/) || value === '.') &&
      !path.isAbsolute(value)
    ) {
      paths[key] = path.normalize(path.join(packageRoot, value));
    }
  }
}

/**
 * Resolve a relative sqlite filename in one of Ghost's bundled config files
 * against the package root, in place. Filenames from user config, env or argv
 * stay relative and resolve against the working directory, as they always have.
 */
function makeBundledDatabasePathsAbsolute(store: unknown): void {
  if (isObject(store) && isObject(store.database)) {
    makePathsAbsolute(store.database.connection);
  }
}

/**
 * Unlike checkUrlProtocol, this is not duplicated by the schema: it touches the
 * filesystem, so it stays whatever happens to the strictness flag.
 */
function doesContentPathExist(contentPath: unknown): void {
  if (typeof contentPath !== 'string' || !fs.existsSync(contentPath)) {
    // new Error is allowed here, as we do not want config to depend on @tryghost/error
    // @TODO: revisit this decision when @tryghost/error is no longer dependent on all of ghost-ignition
    // oxlint-disable-next-line ghost/ghost-custom/no-native-error
    throw new Error(
      'Your content path does not exist! Please double check `paths.contentPath` in your custom config file e.g. config.production.json.',
    );
  }
}

/**
 * Check if the URL in config has a protocol and sanitise it if not including a warning that it should be changed
 *
 * @TODO: remove once GHOST_CONFIG_SCHEMA_STRICT is gone. This duplicates the
 * `url` rule in ./schema.ts, and has to stay while the flag exists at all,
 * since a deploy can still set it false - see isStrict() in ./validated.ts.
 */
function checkUrlProtocol(url: unknown): void {
  if (typeof url !== 'string' || !url.match(/^https?:\/\//i)) {
    // new Error is allowed here, as we do not want config to depend on @tryghost/error
    // @TODO: revisit this decision when @tryghost/error is no longer dependent on all of ghost-ignition
    // oxlint-disable-next-line ghost/ghost-custom/no-native-error
    throw new Error('URL in config must be provided with protocol, eg. "http://my-ghost-blog.com"');
  }
}

/**
 * Normalize the client name and drop connection keys merged in from the other
 * client, e.g. a sqlite default overridden with mysql. Edits in place.
 *
 * A relative sqlite `filename` from user config is deliberately left relative,
 * see makeBundledDatabasePathsAbsolute.
 */
function sanitizeDatabaseProperties(database: unknown): void {
  if (!isObject(database)) {
    return;
  }

  if (database.client === 'mysql') {
    database.client = 'mysql2';
  }

  if (database.client === 'sqlite3') {
    database.client = 'better-sqlite3';
  }

  const connection = database.connection;
  if (!isObject(connection)) {
    return;
  }

  if (database.client === 'mysql2') {
    delete connection.filename;
  } else {
    delete connection.host;
    delete connection.user;
    delete connection.password;
    delete connection.database;
  }
}

/**
 * Merge every nconf store into one plain tree, highest priority winning.
 *
 * Unlike `nconf.get()`, a non-object never replaces an object from a
 * lower-priority store. nconf's per-key reads always worked this way -
 * `get('admin:redirects')` looks straight past a string `admin` in one store to
 * the defaults below it - and every config read before the frozen tree was
 * per-key, so a self-hoster config like `"admin": "https://..."` was a silent
 * no-op. A whole-tree merge would drop all of `admin`'s defaults instead.
 */
function mergeStores(nconf: Provider): Tree {
  const stores = Object.values(
    nconf.stores as Record<string, { store?: unknown; file?: string; type: string }>,
  );
  const tree: Tree = {};

  // nconf lists stores highest priority first
  for (const store of stores.reverse()) {
    if (isObject(store.store)) {
      mergeInto(tree, store.store, '', store.file ?? `the ${store.type} config`);
    }
  }

  return tree;
}

function mergeInto(target: Tree, source: Tree, parent: string, origin: string): void {
  for (const [key, value] of Object.entries(source)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }

    const keyPath = parent ? `${parent}.${key}` : key;
    const existing = target[key];

    if (isObject(value)) {
      if (!isObject(existing)) {
        target[key] = {};
      }
      mergeInto(target[key] as Tree, value, keyPath, origin);
    } else if (isObject(existing)) {
      const type =
        value === null ? 'null' : Array.isArray(value) ? 'an array' : `a ${typeof value}`;
      // eslint-disable-next-line no-console
      console.warn(
        `Ghost config: ignoring \`${keyPath}\` in ${origin}: it is ${type}, but Ghost expects an object there.`,
      );
    } else {
      target[key] = value;
    }
  }
}

function getNodeEnv(): string {
  return process.env.NODE_ENV || 'development';
}

const jsoncFormat: IFormat = {
  parse: function (text: string) {
    return jsonc.parse(text);
  },
  stringify: function (obj: unknown, replacer: unknown, spacing?: unknown) {
    return JSON.stringify(
      obj,
      replacer as Parameters<typeof JSON.stringify>[1],
      spacing as string | number,
    );
  },
};

export {
  makePathsAbsolute,
  makeBundledDatabasePathsAbsolute,
  doesContentPathExist,
  checkUrlProtocol,
  sanitizeDatabaseProperties,
  mergeStores,
  getNodeEnv,
  jsoncFormat,
};
