import { z } from 'zod';

// Query values arrive as strings, internal callers may pass numbers. Coercing to a
// string before matching keeps the legacy validator's `_.toString()` behaviour.
const matching = (pattern: RegExp) => z.coerce.string().regex(pattern);

/** An object id, or `me` for the current user. */
export const id = matching(/^(?:[a-f\d]{24}|me)$/i);

export const slug = matching(/^[a-z0-9\-_]+$/);

export const page = matching(/^\d+$/);

/** A positive count, or `all`. */
export const limit = matching(/^(?:\d+|all)$/);

export const order = matching(/^[a-z0-9_,. ]+$/i);

/** NQL filters are parsed by the model layer, not here. */
export const filter = z.unknown().optional();

/** Column names are checked by the model layer, not here. */
export const fields = z.unknown().optional();

const list = z
  .union([z.string(), z.array(z.string())])
  .transform((value) => (Array.isArray(value) ? value : value.toLowerCase().split(',')))
  .transform((values) => values.map((value) => value.trim()).filter(Boolean));

/** Relations to load. Unknown relations are dropped, not rejected. */
export const include = <const Allowed extends string>(allowed: readonly Allowed[]) =>
  list.transform((values) =>
    values.filter((value): value is Allowed => (allowed as readonly string[]).includes(value)),
  );

/** Content formats to return. Unknown formats are rejected. */
export const formats = <const Allowed extends string>(allowed: readonly Allowed[]) =>
  list.pipe(z.array(z.enum(allowed)));
