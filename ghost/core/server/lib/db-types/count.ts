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
