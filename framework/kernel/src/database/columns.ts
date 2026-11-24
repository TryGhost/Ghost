/**
 * Column codecs: what a column holds, read the same whichever database handed it back.
 *
 * MySQL and SQLite return booleans, counts, dates and JSON differently. Each codec
 * normalises on read and passes the value through on write, so code that is handed a
 * `Database` never has to know which one it is talking to. Stateless: zod schemas and
 * pure functions only.
 */
import { DateTime } from 'luxon';
import * as errors from '@tryghost/errors';
import { z } from 'zod';

const databaseCountInput = z.union([z.number(), z.string().regex(/^\d+$/)]);

/**
 * A non-negative integer count, whichever database driver handed it back.
 *
 * Aggregate functions such as COUNT can return a decimal string from MySQL and
 * a number from SQLite. Every read normalises to a safe integer so callers do
 * not need to handle that driver difference themselves.
 */
export const DbCount = z.codec(
  databaseCountInput,
  z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  {
    decode: (stored) => (typeof stored === 'string' ? Number(stored) : stored),
    encode: (value) => value,
  },
);

/**
 * A boolean column, whichever engine handed it back.
 *
 * SQLite has no boolean type and answers with 0 or 1; MySQL answers with a boolean. Every
 * read normalises so nothing downstream has to know which database it is talking to, and
 * so a falsy check never has to reason about the number zero.
 *
 * Encoding leaves the value alone: a boolean column takes a boolean, and takes the 0 or 1
 * it gave us just as happily.
 */
export const DbBoolean = z.codec(z.union([z.boolean(), z.number()]), z.boolean(), {
  decode: (stored) => Boolean(stored),
  encode: (value) => value,
});

const DATABASE_DATE_FORMAT = 'yyyy-MM-dd HH:mm:ss';

const databaseDateInput = z.union([z.date(), z.string(), z.number()]);

export type DatabaseDate = z.input<typeof databaseDateInput>;

const parseDatabaseDateString = (value: string): DateTime => {
  const sql = DateTime.fromSQL(value, { zone: 'utc' });

  return sql.isValid ? sql : DateTime.fromISO(value, { zone: 'utc' });
};

const parseDatabaseDate = (date: DatabaseDate): DateTime => {
  const input = databaseDateInput.safeParse(date);

  if (!input.success) {
    throw new errors.InternalServerError({ message: 'Invalid database date' });
  }

  let parsed: DateTime;

  if (typeof input.data === 'string') {
    parsed = parseDatabaseDateString(input.data);
  } else if (typeof input.data === 'number') {
    parsed = DateTime.fromMillis(input.data, { zone: 'utc' });
  } else {
    parsed = DateTime.fromJSDate(input.data, { zone: 'utc' });
  }

  if (!parsed.isValid) {
    throw new errors.InternalServerError({ message: 'Invalid database date' });
  }

  return parsed;
};

// Raw Knex queries need this UTC datetime format for consistent MySQL and SQLite behavior.
export const toDatabaseDate = (date: DatabaseDate): string =>
  parseDatabaseDate(date).toFormat(DATABASE_DATE_FORMAT);

export const fromDatabaseDate = (date: DatabaseDate): Date => parseDatabaseDate(date).toJSDate();

// A zod codec for datetime columns: MySQL returns a Date, SQLite a string/number;
// normalise to a Date on read and pass a Date through on write.
// On SQLite, Knex binds the Date that DbDate passes through as epoch milliseconds (stored as
// INTEGER) while toDatabaseDate writes TEXT; SQLite orders INTEGER before TEXT, so never compare
// or order those two representations.
export const DbDate = z.codec(databaseDateInput, z.date(), {
  decode: fromDatabaseDate,
  encode: (date) => date,
});

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

const rawUpdateResult = z.union([
  z.tuple([z.object({ affectedRows: DbCount })]).rest(z.unknown()),
  z.object({ changes: DbCount }),
]);

/** Normalize Knex raw UPDATE results from MySQL tuples and SQLite run results. */
export function getAffectedRows(result: unknown): number {
  const parsed = rawUpdateResult.parse(result);
  return Array.isArray(parsed) ? parsed[0].affectedRows : parsed.changes;
}
