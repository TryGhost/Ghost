import path from 'node:path';
import * as jsonc from 'jsonc-parser';
import Nconf, { type IFormat, type Provider } from 'nconf';
import { isSecretFileRef, loadSecretsFromEnv } from './secrets';

type Tree = Record<string, unknown>;

function isObject(value: unknown): value is Tree {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export interface ConfigLabels {
  readonly name?: string;
  readonly owner?: string;
}

export const jsoncFormat: IFormat = {
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

/**
 * Merge every nconf store into one plain tree, highest priority winning.
 *
 * Unlike `nconf.get()`, a non-object never replaces an object from a
 * lower-priority store. nconf's per-key reads always worked this way -
 * `get('admin:redirects')` looks straight past a string `admin` in one store to
 * the defaults below it - so a config like `"admin": "https://..."` was a
 * silent no-op. A whole-tree merge would drop all of `admin`'s defaults instead.
 *
 * @param labels.name - What the config is called in the warning, such as "Ghost config".
 * @param labels.owner - Who expects the object, such as "Ghost".
 */
export function mergeStores(nconf: Provider, labels: ConfigLabels = {}): Tree {
  const stores = Object.values(
    nconf.stores as Record<string, { store?: unknown; file?: string; type: string }>,
  );
  const tree: Tree = {};

  // nconf lists stores highest priority first
  for (const store of stores.reverse()) {
    if (isObject(store.store)) {
      mergeInto(tree, store.store, '', store.file ?? `the ${store.type} config`, labels);
    }
  }

  return tree;
}

function mergeInto(
  target: Tree,
  source: Tree,
  parent: string,
  origin: string,
  labels: ConfigLabels,
): void {
  const { name = 'Config', owner = 'the application' } = labels;
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
      mergeInto(target[key] as Tree, value, keyPath, origin, labels);
    } else if (isObject(existing)) {
      const type =
        value === null ? 'null' : Array.isArray(value) ? 'an array' : `a ${typeof value}`;
      // eslint-disable-next-line no-console
      console.warn(
        `${name}: ignoring \`${keyPath}\` in ${origin}: it is ${type}, but ${owner} expects an object there.`,
      );
    } else {
      target[key] = value;
    }
  }
}

export interface ConfigSources {
  /** The environment's name: picks `config.<env>.json` in both folders. */
  readonly env: string;
  /** The application's own folder: `overrides.json`, `defaults.json` and `env/config.<env>.json`. */
  readonly baseDir: string;
  /** Where whoever runs the application keeps `config.<env>.json` and `config.local.json(c)`. */
  readonly customDir: string;
  /** Whether `config.local.json` and `config.local.jsonc` are read. */
  readonly local?: boolean;
  /**
   * Extra files in the application's `env/` folder, by store name, read after
   * the custom environment file and before the local files, when `local` is set.
   */
  readonly extraEnvFiles?: Readonly<Record<string, string>>;
  /** Called with each of the application's own stores before they are merged. */
  readonly prepareBundledStore?: (store: unknown) => void;
  /** What the config and its owner are called in warnings. */
  readonly labels?: ConfigLabels;
}

/**
 * Layers an application's config sources into one plain tree. First wins:
 *
 * 1. `overrides.json` in the application's folder
 * 2. command-line arguments
 * 3. secret files referenced by `<key>_FILE` environment variables
 * 4. environment variables (`a__b=value`)
 * 5. `config.<env>.json` in the custom folder
 * 6. any extra environment files, then `config.local.json`, then `config.local.jsonc`
 * 7. `env/config.<env>.json`, then `defaults.json`, in the application's folder
 *
 * This is the one place that reads the process's arguments, environment and
 * config files. It returns plain data and keeps nothing.
 */
export function loadConfigSources(sources: ConfigSources): Tree {
  const { env, baseDir, customDir, local = false, extraEnvFiles = {}, labels } = sources;
  const nconf = new Nconf.Provider();
  const bundled = ['overrides', 'default-env', 'defaults'];

  // no channel can override the overrides
  nconf.file('overrides', path.join(baseDir, 'overrides.json'));

  // command line arguments take precedence, then secret files, then environment variables
  nconf.argv();
  // secrets are not parsed - a password like `01234` must stay a string
  nconf.add('secrets', { type: 'literal', store: loadSecretsFromEnv() });
  nconf.env({
    separator: '__',
    parseValues: true,
    // the secrets store has already resolved these, so keep the file paths themselves
    // out of config - otherwise e.g. `database:connection` gains a bogus `password_FILE` key
    transform: ({ key, value }: { key: string; value: string }) =>
      isSecretFileRef(key) ? false : { key, value },
  });

  nconf.file('custom-env', path.join(customDir, `config.${env}.json`));
  if (local) {
    for (const [store, file] of Object.entries(extraEnvFiles)) {
      nconf.file(store, path.join(baseDir, 'env', file));
      bundled.push(store);
    }
    nconf.file('local-env', path.join(customDir, 'config.local.json'));
    nconf.file('local-env-jsonc', {
      file: path.join(customDir, 'config.local.jsonc'),
      format: jsoncFormat,
    });
  }
  nconf.file('default-env', path.join(baseDir, 'env', `config.${env}.json`));

  // Finally the defaults: if nothing else has a value, this will
  nconf.file('defaults', path.join(baseDir, 'defaults.json'));

  for (const store of bundled) {
    sources.prepareBundledStore?.(nconf.stores[store]?.store);
  }

  return mergeStores(nconf, labels);
}
