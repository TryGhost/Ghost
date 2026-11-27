/**
 * Returns the first `length` characters of `text`, counting characters as Unicode code points.
 * MySQL's utf8mb4 columns count code points, so the result fits a column whose maxlength is
 * `length`, and Ghost's length validation never counts more characters than that, so the result
 * passes it too. `String.prototype.slice` counts UTF-16 code units instead: it counts an emoji
 * such as 🙂 as two characters and can cut it in half. A character built from several code points,
 * such as a flag, can still be cut partway through.
 */
export function truncateCharacters(text: string, length: number): string {
  return Array.from(text).slice(0, length).join('');
}
