export interface Label {
    name: string;
}

/**
 * Any column the parser does not special-case is coerced, so a cell reading
 * TRUE or FALSE arrives as a boolean and an empty one as null, whatever the
 * column means. A member genuinely named TRUE parses to `name: true`.
 */
export type ParsedValue = string | boolean | null;

/**
 * A CSV row as it is built during parsing: each mapped column coerced to a
 * primitive, and any unmapped column (e.g. custom_fields.*) carried through under
 * its own name. The named columns are the vocabulary the import reads; the index
 * signature holds everything else a source preserves. Labels are a loose union
 * while the row is built -- parse resolves them to `ParsedCsvRow` below.
 */
export interface CsvRow {
    id?: ParsedValue;
    email?: ParsedValue;
    name?: ParsedValue;
    note?: ParsedValue;
    subscribed?: boolean;
    complimentary_plan?: boolean;
    stripe_customer_id?: ParsedValue;
    created_at?: ParsedValue;
    labels?: string | Array<string | Label>;
    import_tier?: ParsedValue;
    gift_id?: ParsedValue;
    [column: string]: unknown;
}

/**
 * A row as parse produces it: parse always resolves labels to a Label array, so
 * its output is this stricter row. Consumers should type against it rather than
 * CsvRow, which would force a cast back to Label[].
 */
export interface ParsedCsvRow extends CsvRow {
    labels: Label[];
}
