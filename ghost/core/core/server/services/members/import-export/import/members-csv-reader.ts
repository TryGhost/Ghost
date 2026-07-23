import {parse as parseCSV, transformValue} from '../csv';
import type {MemberImportRow} from './member-import-row';

// The key is a member model field (or a special-purpose field like
// complimentary_plan); the value is an allowed header name in the input CSV.
const DEFAULT_CSV_HEADER_MAPPING: Record<string, string> = {
    email: 'email',
    name: 'name',
    note: 'note',
    subscribed_to_emails: 'subscribed',
    created_at: 'created_at',
    complimentary_plan: 'complimentary_plan',
    stripe_customer_id: 'stripe_customer_id',
    labels: 'labels',
    import_tier: 'import_tier',
    gift_id: 'gift_id'
};

// Read a members CSV into import rows. All CSV-specific handling -- header mapping,
// value coercion, ragged rows -- lives here, so the import service only ever sees
// clean MemberImportRow values and could be fed by a different source unchanged.
export default async function readMemberRows(path: string, mapping?: Record<string, string>): Promise<MemberImportRow[]> {
    // Compose the caller's mapping with the member-field defaults so one parse yields
    // member fields. When two headers map to the same field, the last column in a row
    // wins (papaparse overwrites the key), matching the raw-mapping parse this replaced.
    const composed: Record<string, string> = {};
    for (const [csvHeader, field] of Object.entries(mapping || DEFAULT_CSV_HEADER_MAPPING)) {
        composed[csvHeader] = Object.hasOwn(DEFAULT_CSV_HEADER_MAPPING, field) ? DEFAULT_CSV_HEADER_MAPPING[field] : field;
    }

    const parsedRows = await parseCSV(path, composed);
    // Fill columns a row omits by coercing them as an empty cell -- a missing
    // subscribed reads as true, complimentary_plan as false, everything else as null --
    // matching how the old rectangular-CSV round trip filled short rows.
    const allColumns = [...new Set(parsedRows.flatMap(row => Object.keys(row)))];
    return parsedRows.map((row) => {
        const full: MemberImportRow = {labels: row.labels};
        for (const column of allColumns) {
            full[column] = Object.hasOwn(row, column) ? row[column] : transformValue(column, '');
        }
        return full;
    });
}
