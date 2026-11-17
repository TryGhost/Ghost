import path from 'node:path';
import fs from 'node:fs';
import type { Provider } from 'nconf';
import { jsoncFormat, mergeStores as merge } from '@tryghost/foundry/config/sources';

type Tree = Record<string, unknown>;

function isObject(value: unknown): value is Tree {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const packageRoot = path.join(__dirname, '../../..');

/** Resolve a relative path against the package root. An absolute one is returned as is. */
function makePathAbsolute(value: string): string {
  return path.isAbsolute(value) ? value : path.normalize(path.join(packageRoot, value));
}

/**
 * Resolve a relative sqlite filename in one of Ghost's bundled config files
 * against the package root, in place. Filenames from user config, env or argv
 * stay relative and resolve against the working directory, as they always have.
 *
 * Done per store, before they're merged, because the schema only sees the merged
 * tree and can't tell which source a filename came from. Resolving them all
 * against the package root broke Docker installs - see TryGhost/Ghost#31976.
 */
function makeBundledDatabasePathsAbsolute(store: unknown): void {
  const connection = isObject(store) && isObject(store.database) ? store.database.connection : null;
  if (isObject(connection) && typeof connection.filename === 'string') {
    connection.filename = makePathAbsolute(connection.filename);
  }
}

/**
 * A copy of `paths` with every relative path resolved against the package root.
 *
 * A value counts as a path if it contains a / or \ or is ".".
 */
function makePathsAbsolute<T extends Record<string, unknown>>(paths: T): T {
  return Object.fromEntries(
    Object.entries(paths).map(([key, value]) => [
      key,
      typeof value === 'string' && (/[/\\]/.test(value) || value === '.')
        ? makePathAbsolute(value)
        : value,
    ]),
  ) as T;
}

/**
 * Not in the schema: it touches the filesystem. Runs after createConfig, once
 * the schema has made contentPath absolute.
 */
function assertContentPathExists(contentPath: unknown): void {
  if (typeof contentPath !== 'string' || !fs.existsSync(contentPath)) {
    // new Error is allowed here, as we do not want config to depend on @tryghost/error
    // @TODO: revisit this decision when @tryghost/error is no longer dependent on all of ghost-ignition
    // oxlint-disable-next-line ghost/ghost-custom/no-native-error
    throw new Error(
      'Your content path does not exist! Please double check `paths.contentPath` in your custom config file e.g. config.production.json.',
    );
  }
}

/** What Ghost's config and its owner are called in warnings. */
const configLabels = { name: 'Ghost config', owner: 'Ghost' };

/** Merge every nconf store into one plain tree, highest priority winning. */
function mergeStores(nconf: Provider): Tree {
  return merge(nconf, configLabels);
}

function getNodeEnv(): string {
  return process.env.NODE_ENV || 'development';
}

export {
  makePathAbsolute,
  makePathsAbsolute,
  makeBundledDatabasePathsAbsolute,
  assertContentPathExists,
  mergeStores,
  configLabels,
  getNodeEnv,
  jsoncFormat,
};
