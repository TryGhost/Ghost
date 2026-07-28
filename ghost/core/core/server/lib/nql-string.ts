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
