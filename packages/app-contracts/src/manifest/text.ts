import { z } from 'zod';

// What a name or description may contain: letters, combining marks, digits, punctuation,
// symbols and spaces, plus the two joiners that emoji sequences and scripts such as Persian
// need. Everything else is refused by not being listed: control and formatting characters,
// line breaks, the characters that reorder text, private-use and unassigned code points.
// Those let a name read as something other than what it is on the consent screen.
const PLAIN_TEXT = /^[\p{L}\p{M}\p{N}\p{P}\p{S}\p{Zs}‌‍]*$/u;

// Marks and joiners render nothing on their own, so text made only of those is refused.
const VISIBLE_CHARACTER = /[\p{L}\p{N}\p{P}\p{S}]/u;

/** One line of plain text, trimmed, as shown to a publisher. */
export function plainText(maxLength: number) {
  return z
    .string('Expected text')
    .trim()
    .refine((value) => VISIBLE_CHARACTER.test(value), 'Expected text')
    .max(maxLength, `Expected at most ${maxLength} characters`)
    .refine((value) => PLAIN_TEXT.test(value), 'Expected plain text on one line');
}
