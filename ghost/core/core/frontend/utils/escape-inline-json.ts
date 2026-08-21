/**
 * Escape a `JSON.stringify` result for inclusion in an inline `<script>`.
 *
 * A `<script>` is HTML raw text: the parser stops only at the literal `</script`
 * and never decodes character references, so HTML-entity escaping would corrupt
 * the data rather than protect it. Escaping the breakout characters as JSON `\u`
 * sequences round-trips exactly while `</script>` and `<!--` can no longer form.
 * U+2028/U+2029 are legal in JSON but end a line in JavaScript, so they go too.
 */
export function escapeInlineJson(json: string): string {
  return json
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
