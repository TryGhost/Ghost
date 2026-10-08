import path from 'node:path';
import fs from 'node:fs';
import * as jsonc from 'jsonc-parser';
import type { Provider, IFormat } from 'nconf';

/**
 * transform all relative paths to absolute paths
 * @TODO: re-write this function a little bit so we don't have to add the parent path - that is hard to understand
 *
 * Path must be string.
 * Path must match minimum one / or \
 * Path can be a "." to re-present current folder
 */
function makePathsAbsolute(nconf: Provider, obj: Record<string, unknown>, parent: string): void {
  Object.entries(obj).forEach(([pathsKey, configValue]) => {
    if (configValue && typeof configValue === 'object') {
      makePathsAbsolute(nconf, configValue as Record<string, unknown>, parent + ':' + pathsKey);
    } else if (
      typeof configValue === 'string' &&
      (configValue.match(/\/+|\\+/) || configValue === '.') &&
      !path.isAbsolute(configValue)
    ) {
      nconf.set(
        parent + ':' + pathsKey,
        path.normalize(path.join(__dirname, '../../..', configValue)),
      );
    }
  });
}

/**
 * Unlike checkUrlProtocol, this is not duplicated by the schema: it touches the
 * filesystem, so it stays whatever happens to the strictness flag.
 */
function doesContentPathExist(contentPath: string): void {
  if (!fs.existsSync(contentPath)) {
    // new Error is allowed here, as we do not want config to depend on @tryghost/error
    // @TODO: revisit this decision when @tryghost/error is no longer dependent on all of ghost-ignition
    // eslint-disable-next-line ghost/ghost-custom/no-native-error
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
function checkUrlProtocol(url: string): void {
  if (!url.match(/^https?:\/\//i)) {
    // new Error is allowed here, as we do not want config to depend on @tryghost/error
    // @TODO: revisit this decision when @tryghost/error is no longer dependent on all of ghost-ignition
    // eslint-disable-next-line ghost/ghost-custom/no-native-error
    throw new Error('URL in config must be provided with protocol, eg. "http://my-ghost-blog.com"');
  }
}

/**
 * nconf merges all database keys together and this can be confusing
 * e.g. production default database is sqlite, but you override the configuration with mysql
 *
 * this.clear('key') does not work
 * https://github.com/indexzero/nconf/issues/235#issuecomment-257606507
 */
function sanitizeDatabaseProperties(nconf: Provider): void {
  if (nconf.get('database:client') === 'mysql') {
    nconf.set('database:client', 'mysql2');
  }

  if (nconf.get('database:client') === 'sqlite3') {
    nconf.set('database:client', 'better-sqlite3');
  }

  const database = nconf.get('database');
  const client = nconf.get('database:client');

  if (client === 'mysql2') {
    delete database.connection.filename;
  } else {
    delete database.connection.host;
    delete database.connection.user;
    delete database.connection.password;
    delete database.connection.database;
  }

  nconf.set('database', database);

  if (client === 'better-sqlite3') {
    makePathsAbsolute(nconf, nconf.get('database:connection'), 'database:connection');
  }
}

type Tree = Record<string, unknown>;

function isObject(value: unknown): value is Tree {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
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
  doesContentPathExist,
  checkUrlProtocol,
  sanitizeDatabaseProperties,
  mergeStores,
  getNodeEnv,
  jsoncFormat,
};
