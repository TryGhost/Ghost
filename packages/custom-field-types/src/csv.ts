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
