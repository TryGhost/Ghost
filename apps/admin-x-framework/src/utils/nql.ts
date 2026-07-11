// NQL's only escape sequences are \' and \" - there is no \\, so a backslash
// is a literal character and doubling it would query a different value.
// Escaping just quotes is still injection-safe: because \\ is never an escape
// pair, the backslash emitted before a quote always parses as the \' escape,
// so no input (including trailing or adjacent backslashes) can turn an
// escaped quote back into a string terminator.
export function escapeNqlString(value: string): string {
    return `'${value.replace(/'/g, '\\\'')}'`;
}
