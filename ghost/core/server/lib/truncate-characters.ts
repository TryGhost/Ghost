/**
 * Truncates `text` to at most `length` Unicode code points. MySQL's utf8mb4 columns count
 * characters as code points, so the result fits a column with a maxlength of `length` and passes
 * Ghost's length validation. `String.prototype.slice` counts UTF-16 code units instead, so it
 * counts an emoji like 🙂 as two characters and can split it in half. A character made of several
 * code points, such as a flag, can still be truncated partway through.
 */
export function truncateCharacters(text: string, length: number): string {
  return Array.from(text).slice(0, length).join('');
}
