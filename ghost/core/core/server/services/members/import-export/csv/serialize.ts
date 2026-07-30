import papaparse from 'papaparse';

interface SerializeOptions {
    // Omitted, papaparse derives the columns (and their order) from the first row's
    // keys -- so a typed shaper's row can define them, with no separate list to drift.
    columns?: string[];
    header?: boolean;
}

// The papaparse boundary: given rows already shaped into cells, it writes CSV and
// nothing else. escapeFormulae is forced on -- papaparse defaults it off, but this CSV
// is opened by a person, so a leading =, +, -, @ or tab must be escaped.
export default function serialize(
    rows: Array<Record<string, unknown>>,
    {columns, header = true}: SerializeOptions = {}
): string {
    return papaparse.unparse(rows, {columns, header, escapeFormulae: true});
}
