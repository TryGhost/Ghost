// NQL only unescapes \' and \" inside quoted strings - a lone backslash is a
// literal character, so escaping backslashes would query a different value
export function escapeNqlString(value: string): string {
    return `'${value.replace(/'/g, '\\\'')}'`;
}
