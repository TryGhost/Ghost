import { z } from 'zod';

import { isPlainText } from '../plain-text.ts';

// Marks and joiners render nothing on their own, so text made only of those is refused.
const VISIBLE_CHARACTER = /[\p{L}\p{N}\p{P}\p{S}]/u;

/** One line of plain text, trimmed, as shown to a publisher. */
export function plainText(maxLength: number) {
  return z
    .string('Expected text')
    .trim()
    .refine((value) => VISIBLE_CHARACTER.test(value), 'Expected text')
    .max(maxLength, `Expected at most ${maxLength} characters`)
    .refine(isPlainText, 'Expected plain text on one line');
}
