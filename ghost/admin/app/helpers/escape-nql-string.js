// Escape a search term and wrap it in single quotes for safe embedding in an
// NQL filter (e.g. `title:~<result>`). Returns the *quoted* string to match the
// `escapeNqlString` contract used elsewhere (apps/posts, admin-x-framework).
// Only single quotes are escaped: the NQL lexer treats just `\'`/`\"` as escapes
// and reads a lone backslash literally. Verified against @tryghost/nql — escaping
// every quote prevents breakout, and backslashes must NOT be doubled (doubling
// corrupts terms containing a backslash, e.g. `a\b` would be searched as `a\\b`).
export function escapeNqlString(term) {
    return '\'' + String(term).replace(/'/g, '\\\'') + '\'';
}
