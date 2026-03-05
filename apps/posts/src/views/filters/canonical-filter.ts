export function canonicalizeFilter(clauses: string[]): string | undefined {
    const normalizedClauses = clauses
        .map(clause => clause.trim())
        .filter(clause => clause.length > 0);

    if (normalizedClauses.length === 0) {
        return undefined;
    }

    return normalizedClauses.sort((a, b) => a.localeCompare(b)).join('+');
}
