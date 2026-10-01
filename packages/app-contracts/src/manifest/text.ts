import { z } from 'zod';

// Control characters, including line breaks, and the characters that reorder text. Both
// let a name read as something other than what it is on the consent screen.
const MISLEADING_CHARACTERS = /[\p{Cc}\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u;

function isPlainText(value: string): boolean {
  return !MISLEADING_CHARACTERS.test(value);
}

/** One line of plain text, trimmed, as shown to a publisher. */
export function plainText(maxLength: number) {
  return z
    .string('Expected text')
    .trim()
    .min(1, 'Expected text')
    .max(maxLength, `Expected at most ${maxLength} characters`)
    .refine(isPlainText, 'Expected plain text on one line');
}
