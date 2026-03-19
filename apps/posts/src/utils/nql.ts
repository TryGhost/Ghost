/**
 * Escape a value for use in NQL filter expressions.
 * Single quotes are doubled to prevent injection.
 */
export function escapeNqlValue(term: string): string {
    return term.replace(/'/g, '\'\'');
}
