import {z} from 'zod';
import {FIELD_TYPES, type FieldType} from './index.ts';

/**
 * How a field's value maps onto CSV columns.
 *
 * CSV is flat and a value need not be, so a composite occupies one column per
 * sub-field. That shape is derived from the type's own value schema rather than
 * declared alongside it: the two cannot drift, and it stays correct as sub-fields
 * are added, removed, or made optional — an optional sub-field is still a column,
 * it just holds an empty cell more often.
 *
 * The same column names are the vocabulary the importer maps onto, so an exported
 * file re-imports without the publisher remapping anything by hand.
 */

const SEPARATOR = '.';

/**
 * Custom field columns are namespaced. A field's key is minted from a name the
 * publisher chose, so nothing stops it landing on a column the export already
 * has — a field named "Email" mints the key `email`. Unnamespaced, that column
 * would quietly take the place of the member's address. The namespace also keeps
 * a core column added in future from colliding with a key minted years earlier.
 *
 * `custom_fields` is the same path the Admin API already uses to address these
 * values, so a column reads like the field it came from.
 */
const NAMESPACE = 'custom_fields';

/** A field definition reduced to what CSV needs to know about it. */
export interface CsvField {
    key: string;
    type: FieldType;
}

function subFieldsOf(type: FieldType): string[] | null {
    const {value} = FIELD_TYPES[type];
    return value instanceof z.ZodObject ? Object.keys(value.shape) : null;
}

function toCell(value: unknown): string {
    return value === undefined || value === null ? '' : String(value);
}

/**
 * The CSV column names one field occupies, in order: one for a scalar, one per
 * sub-field for a composite. The same derivation `csvCellsForFields` uses to key
 * its cells, so the columns a field writes on export are exactly the columns it is
 * read from on import and offered as on the admin's mapping step.
 */
export function csvColumnsForField(field: CsvField): string[] {
    const column = `${NAMESPACE}${SEPARATOR}${field.key}`;
    const subFields = subFieldsOf(field.type);
    return subFields ? subFields.map(sub => `${column}${SEPARATOR}${sub}`) : [column];
}

/** Whether a column name addresses a custom field value rather than a core member column. */
export function isCustomFieldColumn(column: string): boolean {
    return column === NAMESPACE || column.startsWith(`${NAMESPACE}${SEPARATOR}`);
}

// The cell prefixes papaparse's escapeFormulae guards against, prepending a lone
// apostrophe so a spreadsheet cannot read the value as a formula. The export writes
// with that guard on (see the CSV serializer), so `=SUM(A1)` leaves as `'=SUM(A1)`.
const FORMULA_TRIGGERS = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Undo the export's formula guard so a value round-trips byte-identically. A lone
 * leading apostrophe before a formula trigger is the guard the export added, not
 * something the publisher typed, so it is stripped; an apostrophe before anything
 * else is left as the character it is. Without this a value like `=SUM(A1)` would
 * gain an apostrophe on every export/import cycle.
 */
function stripFormulaGuard(cell: string): string {
    if (cell.charAt(0) === '\'' && FORMULA_TRIGGERS.includes(cell.charAt(1))) {
        return cell.slice(1);
    }
    return cell;
}

/**
 * The CSV cells for one member's custom field values, keyed by column name.
 *
 * Every column of every field passed in is present in the result, whether or not
 * the member holds a value for it. Callers derive the CSV header from a single
 * row, so a key omitted here is a column dropped from the whole export.
 */
export function csvCellsForFields(fields: readonly CsvField[], values: Record<string, unknown>): Record<string, string> {
    const cells: Record<string, string> = {};

    for (const field of fields) {
        const value = values[field.key];
        const subFields = subFieldsOf(field.type);
        const column = `${NAMESPACE}${SEPARATOR}${field.key}`;

        if (!subFields) {
            cells[column] = toCell(value);
            continue;
        }

        const composite = (value ?? {}) as Record<string, unknown>;
        for (const sub of subFields) {
            cells[`${column}${SEPARATOR}${sub}`] = toCell(composite[sub]);
        }
    }

    return cells;
}

/**
 * Read one CSV row's custom field cells back into the values a member write takes,
 * keyed by field key. The inverse of `csvCellsForFields`, sharing its namespace and
 * sub-field derivation so an exported file re-imports onto the same fields. Only the
 * fields passed in are read, so a column naming no active field is left untouched —
 * an unrecognised custom field column is dropped, not an error.
 *
 * A field is written only from a non-blank cell. A blank cell — like an absent column —
 * leaves the member's existing value untouched, matching how the importer keeps a
 * member's existing name or note when that column is blank: a blank cell in a bulk file
 * means "no data for this row", not "delete this value". Clearing a value is left to the
 * member editor, where an emptied input is an unambiguous intent that a blank CSV cell
 * is not.
 *
 * A composite follows the same rule at the whole-value level: the export cannot tell
 * "no address" from "an address that is all blanks" — it writes both as empty cells — so
 * an all-blank composite is treated as absent and omitted rather than failing the row of
 * every member who simply has no address. A composite with at least one filled cell is
 * read as a value from its non-blank cells and validated as a whole, so a partial
 * address missing a required sub-field fails its row like any other invalid value.
 */
export function fieldValuesFromCsvRow(fields: readonly CsvField[], row: Record<string, unknown>): Record<string, unknown> {
    const values: Record<string, unknown> = {};

    // A custom field column is only ever a string cell (the parser carries unmapped
    // columns through as raw strings and drops anything else), so a non-string here is
    // a column that is not present -- which is the untouched reading.
    for (const field of fields) {
        const column = `${NAMESPACE}${SEPARATOR}${field.key}`;
        const subFields = subFieldsOf(field.type);

        if (!subFields) {
            const cell = row[column];
            if (typeof cell === 'string') {
                const stripped = stripFormulaGuard(cell);
                // A blank cell leaves the field untouched, not cleared (see above).
                if (stripped !== '') {
                    values[field.key] = stripped;
                }
            }
            continue;
        }

        let anyColumnPresent = false;
        const composite: Record<string, string> = {};
        for (const sub of subFields) {
            const cell = row[`${column}${SEPARATOR}${sub}`];
            if (typeof cell === 'string') {
                anyColumnPresent = true;
                const stripped = stripFormulaGuard(cell);
                // An empty sub-cell is an omitted sub-field, not the empty string:
                // the value schema decides whether that sub-field was required.
                if (stripped !== '') {
                    composite[sub] = stripped;
                }
            }
        }

        if (anyColumnPresent && Object.keys(composite).length > 0) {
            values[field.key] = composite;
        }
    }

    return values;
}
