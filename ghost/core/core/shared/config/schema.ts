import type { OmitIndexSignature } from 'type-fest';
import { z } from 'zod';

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
