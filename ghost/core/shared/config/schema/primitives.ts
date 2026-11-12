import { z } from 'zod';
import { reportUnknownKeys } from '../report';
import { getNodeEnv } from '../utils';

/**
 * An absolute `http://` or `https://` URL. Parsed with `new URL()`, as Ghost's
 * own URL helpers do, so anything this rejects they would already throw on.
 */
export function httpUrl(params: Parameters<typeof z.url>[0] = {}) {
  return z.url({
    protocol: /^https?$/,
    error: 'Must be a full URL starting with http:// or https://',
    ...(typeof params === 'string' ? { error: params } : params),
  });
}

/**
 * A closed object that reports keys it does not name, then strips them.
 *
 * Under test an unknown key is this repo's mistake, so it fails the parse with
 * zod's own `unrecognized_keys` issue, as `z.strictObject` would. Elsewhere it
 * only warns, even in strict mode: a strict object would make every new key a
 * breaking change for configs written against an older Ghost. The environment
 * is read at parse time, as the loader reads it. `name` labels the warning; a
 * transform cannot see its own path.
 */
export function knownKeys<S extends z.ZodRawShape>(name: string, shape: S) {
  const isKnown = (key: string) => Object.hasOwn(shape, key);

  return z.looseObject(shape).transform((value, ctx) => {
    const unknown = Object.keys(value).filter((key) => !isKnown(key));

    if (unknown.length && getNodeEnv().startsWith('test')) {
      ctx.issues.push({ code: 'unrecognized_keys', keys: unknown, input: value });
    } else {
      reportUnknownKeys(unknown.map((key) => [name, key]));
    }

    return Object.fromEntries(Object.entries(value).filter(([key]) => isKnown(key))) as z.output<
      z.ZodObject<S>
    >;
  });
}

/**
 * A TCP port. A quoted port is coerced, as drivers accept one anyway. Digits
 * only, as `z.coerce` would take `true` as 1.
 */
export const tcpPort = z
  .union([z.number(), z.string().regex(/^\d+$/).transform(Number)])
  .pipe(z.number().int().min(1).max(65535));
