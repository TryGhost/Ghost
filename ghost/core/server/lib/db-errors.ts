import { z } from 'zod';

const DatabaseError = z.object({ code: z.string(), message: z.string() });

/**
 * Whether a write failed because a value that must be unique is already taken: a unique index
 * or a primary key rejected the row.
 *
 * MySQL has a code for exactly that. SQLite reports every constraint a row breaks under one
 * code, which Ghost's driver patch reduces its more specific codes to, so there the message
 * tells a value that is taken from a missing value or a broken foreign key.
 */
export function isUniqueViolation(err: unknown): boolean {
  const failed = DatabaseError.safeParse(err);
  if (!failed.success) {
    return false;
  }
  const { code, message } = failed.data;
  return (
    code === 'ER_DUP_ENTRY' ||
    (code.startsWith('SQLITE_CONSTRAINT') && message.includes('UNIQUE constraint failed'))
  );
}

/**
 * The column a unique index over that one column of `table` holds, when that index rejected the
 * write `err` failed with: `name` when another row has the name, for example. Undefined when `err`
 * isn't a unique violation, or when the database doesn't name one column of `table`, as for an
 * index over several columns and, on MySQL, the primary key.
 *
 * MySQL names the index at the end of its message, as `segments_name_unique` or, from 8.0.19,
 * `segments.segments_name_unique`, and Ghost's schema names the unique index over one column
 * `<table>_<column>_unique`. SQLite names the columns instead, as `segments.name`, and names the
 * primary key's column too.
 */
export function uniqueViolationColumn(err: unknown, table: string): string | undefined {
  const failed = DatabaseError.safeParse(err);
  if (!failed.success || !isUniqueViolation(err)) {
    return undefined;
  }
  const { message } = failed.data;

  const index = /for key '([^']*)'$/.exec(message)?.[1];
  if (index !== undefined) {
    const unqualified = index.startsWith(`${table}.`) ? index.slice(table.length + 1) : index;
    const prefix = `${table}_`;
    const suffix = '_unique';
    return unqualified.length > prefix.length + suffix.length &&
      unqualified.startsWith(prefix) &&
      unqualified.endsWith(suffix)
      ? unqualified.slice(prefix.length, -suffix.length)
      : undefined;
  }

  const columns = /UNIQUE constraint failed: (.+)$/.exec(message)?.[1].split(', ') ?? [];
  const [column] = columns;
  return columns.length === 1 && column.startsWith(`${table}.`)
    ? column.slice(table.length + 1)
    : undefined;
}
