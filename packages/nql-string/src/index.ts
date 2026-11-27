// Escape an arbitrary value and wrap it in single quotes for safe embedding in
// an NQL filter, e.g. `to:${escapeNqlString(url)}`.
//
// Both quote characters are escaped, not just the delimiter: the NQL lexer
// rejects a bare `"` inside a single-quoted string (and a bare `'` inside a
// double-quoted one), so `to:'say "hi"'` is a parse error rather than a
// literal match.
//
// Backslashes are deliberately left alone. NQL's only escape sequences are
// `\'` and `\"` - there is no `\\`, so a lone backslash is a literal character
// and doubling it would query a different value. This is still injection-safe:
// because `\\` is never an escape pair, the backslash emitted before a quote
// always parses as the `\'` escape, so no input (including trailing or
// adjacent backslashes) can turn an escaped quote back into a terminator.
//
// The value must be non-empty: NQL's string rule requires at least one
// character, so `''` is a parse error rather than an empty match.
export function escapeNqlString(value: string): string {
  return `'${value.replace(/(['"])/g, '\\$1')}'`;
}

// Combining filters brackets every part, so a comma inside one part can't change which other
// parts it groups with. `+` binds tighter than `,`, so `status:free,status:paid` joined with
// `label:vip` as `status:free,status:paid+label:vip` would match every free member. Each part must
// be a valid filter on its own: a part with an unmatched bracket, such as `label:vip),(id:-null`,
// closes the bracket around it and joins the parts beside it.

/**
 * A filter that matches what every one of `filters` matches. A part that is undefined adds no
 * condition, and with no parts left the result is undefined: no condition, so every record
 * matches.
 */
export function allOf(...filters: Array<string | undefined>): string | undefined {
  const parts = filters.filter((filter) => filter !== undefined);
  return parts.length > 1 ? parts.map((filter) => `(${filter})`).join('+') : parts[0];
}
