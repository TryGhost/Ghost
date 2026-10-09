import { z } from 'zod';

/**
 * A column holding JSON text, read against the schema of the value it encodes.
 *
 * A codec rather than a parse on the way out, so the write stores what the read accepts.
 * Zod validates JSON-compatible values (`z.json()`) but has no built-in for parsing JSON
 * text, so decoding the text is this codec's job: text that is not JSON fails with one
 * custom issue carrying the text, and text that is JSON is then checked against `schema`.
 *
 * `message` names the column's value in that issue, as in "The stored manifest is not JSON."
 */
export function DbJson<Schema extends z.ZodType>(
  schema: Schema,
  { message = 'The stored value is not JSON.' }: { message?: string } = {},
) {
  return z.codec(z.string(), schema, {
    decode: (text, ctx) => {
      try {
        return JSON.parse(text);
      } catch {
        ctx.issues.push({ code: 'custom', message, input: text });
        return z.NEVER;
      }
    },
    encode: (value) => JSON.stringify(value),
  });
}
