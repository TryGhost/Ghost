import { z } from 'zod';

/**
 * A column holding JSON text, read against the schema of the value it encodes.
 *
 * A codec rather than a parse on the way out, so the write stores what the read accepts.
 * Zod validates JSON-compatible values (`z.json()`) but has no built-in for parsing JSON
 * text, so decoding the text is this codec's job: text that is not JSON fails with one
 * `invalid_format` issue for the `json` format, and text that is JSON is then checked
 * against `schema`.
 *
 * `schema` must take JSON as input, so a write can never store what a read rejects: a
 * `z.date()` would encode as a string it cannot decode, and a `z.bigint()` cannot encode at
 * all. It must also be bidirectional: derive values with `z.codec`, not `.transform()`,
 * which decodes but throws on every encode.
 *
 * `message` names the column's value in that issue, as in "The stored manifest is not JSON."
 */
export function DbJson<Schema extends z.ZodType<unknown, z.core.util.JSONType>>(
  schema: Schema,
  { message = 'The stored value is not JSON.' }: { message?: string } = {},
) {
  return z.codec(z.string(), schema, {
    decode: (text, ctx) => {
      try {
        return JSON.parse(text);
      } catch {
        ctx.issues.push({ code: 'invalid_format', format: 'json', message, input: text });
        return z.NEVER;
      }
    },
    encode: (value) => JSON.stringify(value),
  });
}
