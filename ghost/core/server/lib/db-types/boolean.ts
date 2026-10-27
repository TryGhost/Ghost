import { z } from 'zod';

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
