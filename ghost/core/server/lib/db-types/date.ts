import { DateTime } from 'luxon';
import * as errors from '@tryghost/errors';
import { z } from 'zod';

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
