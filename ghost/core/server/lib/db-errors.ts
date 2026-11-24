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
