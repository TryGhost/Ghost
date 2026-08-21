/**
 * Escape a serialized JSON string for safe inclusion inside an inline
 * `<script>` block.
 *
 * A `<script>` element is HTML *raw text*: the parser stops only at the literal
 * substring `</script`, and it never decodes HTML character references. So
 * HTML-entity escaping (e.g. `&lt;`) is the wrong tool here — worse than
 * unnecessary, it corrupts the data, because the consumers of these blocks
 * (`JSON.parse` in a bootstrap script, Google's structured-data parser and
 * friends) read the block as JSON and never HTML-decode it, so `Tom & Jerry`
 * would be read as the literal `Tom &amp; Jerry`.
 *
 * Instead we escape only the breakout-relevant characters as JSON `\u` escapes.
 * `JSON.parse` — and every conformant structured-data parser — decodes them
 * back to the original character, so the data round-trips exactly while
 * `</script>` / `<!--` sequences can no longer form (both begin with `<`).
 *
 * U+2028/U+2029 are escaped because they are valid in JSON strings but are line
 * terminators in JavaScript source, so an unescaped one breaks a payload that
 * is parsed as a JS literal rather than via `JSON.parse`.
 *
 * @param {string} json - the output of `JSON.stringify`
 * @returns {string}
 */
module.exports = function escapeInlineJson(json) {
    return json
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
};
