// Escape a search term and wrap it in single quotes for safe embedding in an
// NQL filter, e.g. `title:~<result>`.
//
// Only single quotes are escaped: the NQL lexer treats just `\'`/`\"` as
// escapes and reads a lone backslash literally. Escaping every quote prevents
// breakout, and backslashes must not be doubled because that corrupts terms
// containing a backslash.
export function escapeNqlString(term) {
    return '\'' + String(term).split('\'').join('\\\'') + '\'';
}
