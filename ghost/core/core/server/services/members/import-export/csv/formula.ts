// The export writes with papaparse's escapeFormulae on (see serialize), which prefixes a
// cell starting with one of these with an apostrophe so a spreadsheet won't read it as a
// formula: `=SUM(A1)` is written as `'=SUM(A1)`.
const FORMULA_TRIGGERS = ['=', '+', '-', '@', '\t', '\r'];

// Strip that guard back off, so a re-imported value doesn't gain an apostrophe on every
// round trip. Only a lone apostrophe before a trigger is the guard; one before anything
// else is a character the value actually starts with, and is left alone.
export function stripFormulaGuard(cell: string): string {
    if (cell.charAt(0) === '\'' && FORMULA_TRIGGERS.includes(cell.charAt(1))) {
        return cell.slice(1);
    }
    return cell;
}
