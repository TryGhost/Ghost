import papaparse from 'papaparse';

interface SerializeOptions {
    // The columns to emit, in order. Omitted, papaparse derives them from the first
    // row's keys. The export locks them from its first streamed row; the error report
    // passes the member vocabulary.
    columns?: string[];
    // Whether to write the header row. The streaming export writes it once, on the
    // first chunk only, and turns it off for every row after.
    header?: boolean;
    // Prefixes a leading =, +, -, @ or tab with an apostrophe so a spreadsheet does
    // not read the value as a formula. On by default: it belongs on any CSV a person
    // opens.
    escapeFormulae?: boolean;
    newline?: string;
}

// The vocabulary-agnostic CSV serialiser shared by both directions of the member CSV.
// Given rows and the columns to emit, it writes CSV and nothing else -- it does not
// know what a member is. Callers shape their rows into cells first: the export
// flattens whatever custom field columns the database holds, the import error report
// keeps the fixed member vocabulary. Keeping the columns open is what lets the two
// sides share one serialiser without either constraining the other's column set.
export default function serialize(
    rows: Array<Record<string, unknown>>,
    {columns, header = true, escapeFormulae = true, newline = '\r\n'}: SerializeOptions = {}
): string {
    return papaparse.unparse(rows, {columns, header, escapeFormulae, newline});
}
