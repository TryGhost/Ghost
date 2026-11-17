import _ from 'lodash';
import { z } from 'zod';
import { parseConfigSlice, type Config } from '@tryghost/kernel/config';
import { guardReadOnly } from './guard';
import { lenient, parseLeniently } from './lenient';
import { reportInvalid } from './report';

type Tree = Record<string, unknown>;

/**
 * Recursively freeze a plain-data tree in place. Only safe on a structure
 * nothing else holds a reference to, and an already-frozen subtree is left
 * alone, children included.
 */
export function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  Object.freeze(value);

  for (const child of Object.values(value as Tree)) {
    deepFreeze(child);
  }

  return value;
}

export interface ConfigPolicy<Schema extends z.ZodType> {
  /** The shape of the application's config. Keys it does not name pass through. */
  readonly schema: Schema;
  /** What the config is called in messages, such as "Ghost config". */
  readonly name?: string;
  /**
   * Whether a schema violation is fatal for this tree. When it is not, a bad
   * key falls back to its raw value and is reported. Keys marked
   * `.meta({fatal: true})` are fatal regardless. Defaults to always.
   */
  readonly strict?: (tree: Tree) => boolean;
  /**
   * Whether writes throw (a proxy) instead of being dropped (a frozen object).
   * See ./guard.ts. Defaults to never.
   */
  readonly guard?: (tree: Tree) => boolean;
  /** Appended to the error a guarded write throws: where to read more. */
  readonly guardHint?: string;
}

/** A config built by {@link createConfig}: readable by anything, writable by tests. */
export interface BuiltConfig<Validated> extends Config {
  /** The whole validated tree. `get()` is the usual way in. */
  readonly validated: Validated;
  /**
   * Override a key path and rebuild. For tests only. Each call rebuilds the
   * whole tree from the sources plus every override recorded so far, so config
   * is never briefly half-written.
   *
   * `set(key, undefined)` writes undefined into the tree; it does not uncover a
   * lower-priority source.
   */
  set(key: string, value: unknown): void;
  /** Drop every override and rebuild. For tests only. */
  reset(): void;
}

/**
 * Validate a config tree and make it read-only.
 *
 * Takes ownership of the tree: it is frozen in place, and zod passes keys the
 * schema does not name straight through by reference, so a shared tree would be
 * frozen out from under its other owner.
 */
export function validateConfig<Schema extends z.ZodType>(
  tree: Tree,
  policy: ConfigPolicy<Schema>,
  lenientSchema: Schema = lenient(policy.schema as never) as Schema,
): z.output<Schema> {
  const { schema, name, guardHint } = policy;
  const env = String(tree.env);
  const readOnly = (validated: Tree) =>
    (policy.guard?.(validated)
      ? guardReadOnly(validated, '', guardHint)
      : deepFreeze(validated)) as z.output<Schema>;

  if (policy.strict?.(tree) ?? true) {
    const result = schema.safeParse(tree);
    if (!result.success) {
      reportInvalid(result.error.issues, { strict: true, env, name });
    }
    return readOnly(result.data as Tree);
  }

  // A bad key falls back to its raw value; everything else, transforms
  // included, still parses. Only a `fatal` key fails the whole tree.
  let parsed: ReturnType<typeof parseLeniently>;
  try {
    parsed = parseLeniently(lenientSchema as never, tree);
  } catch (err) {
    if (err instanceof z.ZodError) {
      reportInvalid(err.issues, { strict: true, env, name });
    }
    throw err;
  }

  if (parsed.issues.length) {
    reportInvalid(parsed.issues, { strict: false, env, name });
  }

  return readOnly(parsed.data as Tree);
}

const MISS = Symbol('config.miss');

/** A key that is present but undefined is a hit, not a miss. */
function lookup(root: unknown, key: string): unknown {
  let node: unknown = root;

  for (const segment of key.split(':')) {
    if (node === null || typeof node !== 'object' || !(segment in node)) {
      return MISS;
    }

    node = (node as Tree)[segment];
  }

  return node;
}

/**
 * Write a key path into a tree, copying each level on the way down.
 *
 * The copy is unconditional, because an override's value is written into every
 * later tree by reference and may be an object a caller still holds - usually
 * one a test read back out of config. Writing a deeper path in place would
 * reach back through both. Copying only when a level is frozen looks equivalent
 * but is not: under the guard nothing is frozen, so the same nested override
 * would mutate what an earlier `get()` returned.
 */
function writePath(tree: Tree, key: string, value: unknown): void {
  const segments = key.split(':');
  const leaf = segments.pop() as string;
  let node = tree;

  for (const segment of segments) {
    const child = node[segment];

    if (child === null || typeof child !== 'object') {
      node[segment] = {};
    } else {
      node[segment] = Array.isArray(child) ? [...child] : { ...child };
    }

    node = node[segment] as Tree;
  }

  node[leaf] = value;
}

/**
 * Build an application's config from a merged source tree and the schema the
 * application declares.
 *
 * The sources are layered elsewhere (see ./sources.ts) and are then done with:
 * the read-only, validated tree this holds is the only representation anything
 * reads. One representation is what makes the whole config immutable rather
 * than only the part a schema names.
 */
export function createConfig<Schema extends z.ZodType>(
  sources: Tree,
  policy: ConfigPolicy<Schema>,
): BuiltConfig<z.output<Schema>> {
  const base = structuredClone(sources);
  const overrides = new Map<string, unknown>();
  const lenientSchema = lenient(policy.schema as never) as Schema;

  function build(): z.output<Schema> {
    const tree = structuredClone(base);

    for (const [key, value] of overrides) {
      writePath(tree, key, value);
    }

    return validateConfig(tree, policy, lenientSchema);
  }

  let current = build();

  function rebuild(): void {
    current = build();
  }

  const config = {
    get(key?: string): unknown {
      if (key === undefined) {
        return current;
      }

      const found = lookup(current, key);

      return found === MISS ? undefined : found;
    },

    slice<Slice extends z.ZodType>(path: string, schema: Slice): z.output<Slice> {
      return parseConfigSlice(config.get(path), path, schema);
    },

    set(key: string, value: unknown): void {
      // Cloned first, before anything is recorded: cloning can throw - on a
      // value with a throwing getter, say - and doing it here means that throw
      // cannot leave `overrides` half-updated. cloneDeep rather than
      // structuredClone, because under the guard this value may be a proxy and
      // structuredClone rejects those.
      //
      // The clone itself is needed because rebuild() makes whatever ends up in
      // the tree read-only, and this value is the caller's own object.
      const cloned = _.cloneDeep(value);
      const previous = new Map(overrides);

      // deleted first so the key moves to the end: overrides replay in
      // insertion order, and Map.set on an existing key keeps its old position,
      // which would let an earlier write beat this one. Setting `paths` after
      // `paths:contentPath` has to win.
      overrides.delete(key);
      overrides.set(key, cloned);

      try {
        rebuild();
      } catch (err) {
        // a rejected override must not stay recorded, or every later set()
        // reapplies it and throws again
        overrides.clear();

        for (const [existingKey, existingValue] of previous) {
          overrides.set(existingKey, existingValue);
        }

        rebuild();
        throw err;
      }
    },

    reset(): void {
      overrides.clear();
      rebuild();
    },
  };

  Object.defineProperty(config, 'validated', {
    get: () => current,
    enumerable: true,
    configurable: true,
  });

  return config as typeof config & { readonly validated: z.output<Schema> };
}
