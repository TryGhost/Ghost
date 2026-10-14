// What plain text may contain: letters, combining marks, digits, punctuation, symbols and
// spaces, plus the two joiners that emoji sequences and scripts such as Persian need.
// Everything else is refused by not being listed: control and formatting characters, line
// breaks, the characters that reorder text, private-use and unassigned code points. Those let
// text read as something other than what it is, such as a title that reverses whatever Ghost
// shows after it.
const ALLOWED = '\\p{L}\\p{M}\\p{N}\\p{P}\\p{S}\\p{Zs}\\u200C\\u200D';

const PLAIN_TEXT = new RegExp(`^[${ALLOWED}]*$`, 'u');
const NOT_PLAIN_TEXT = new RegExp(`[^${ALLOWED}]`, 'gu');

/** Whether text is one line of plain text, as a name, a description or a title must be. */
export function isPlainText(value: string): boolean {
  return PLAIN_TEXT.test(value);
}

/** The text without the characters `isPlainText` refuses. */
export function toPlainText(value: string): string {
  return value.replace(NOT_PLAIN_TEXT, '');
}
