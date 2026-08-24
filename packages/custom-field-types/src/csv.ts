import { subFieldsOf, type FieldType } from './index.ts';

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
/**
 * The namespace publisher-defined fields live in, and the path their values are
 * addressed under everywhere: this column prefix, the members filter, and the Admin
 * API. Exported because the server stores it on each field row now that Ghost can
 * declare fields of its own, and the two must agree on the spelling.
 */
export const PUBLISHER_NAMESPACE = 'custom_fields';

/** A field definition reduced to what CSV needs to know about it. */
export interface CsvField {
  namespace: string;
  key: string;
  type: FieldType;
}

/**
 * A member's values, by the namespace that owns the field and then by its key. The two
 * together address a field: a key identifies one only inside its namespace, so the same
 * key can name a different field in each.
 */
export type NamespacedValues = Record<string, Record<string, unknown>>;

/** Where a field's value sits: `<namespace>.<key>`, and a part of it one level deeper. */
function columnFor(field: CsvField): string {
  return `${field.namespace}${SEPARATOR}${field.key}`;
}

function toCell(value: unknown): string {
  return value === undefined || value === null ? '' : String(value);
}

// A cell holding nothing but whitespace carries no more data than an empty one, so both
// read as blank. Without this a stray space is a value: it would be stored as one on a
// scalar, and on a composite it would make an otherwise untouched address fail its "at
// least one part filled in" rule and take the whole member row down with it.
function isBlank(cell: string): boolean {
  return cell.trim() === '';
}

/** A column a field occupies, and which part of the field's value it holds. */
export interface CsvFieldColumn {
  column: string;
  /** The part this column holds, or null where the field's whole value is one column. */
  subField: string | null;
}

// Shares csvCellsForFields' column derivation, so a field is written, read, and offered
// as a mapping target under one set of column names.
export function csvColumnsForField(field: CsvField): CsvFieldColumn[] {
  const column = columnFor(field);
  const subFields = subFieldsOf(field.type);
  return subFields
    ? subFields.map((sub) => ({ column: `${column}${SEPARATOR}${sub}`, subField: sub }))
    : [{ column, subField: null }];
}

/**
 * Whether a column names a field in the given namespace. Takes the namespace rather than
 * assuming the publisher's, because every namespace addresses its fields the same way and
 * only the caller knows which ones it cares about.
 */
export function isFieldColumn(column: string, namespace: string): boolean {
  return column === namespace || column.startsWith(`${namespace}${SEPARATOR}`);
}

/** Whether a column names a field in any of the namespaces given. */
export function isAnyFieldColumn(column: string, namespaces: readonly string[]): boolean {
  return namespaces.some((namespace) => isFieldColumn(column, namespace));
}

/**
 * The CSV cells for one member's custom field values, keyed by column name.
 *
 * Every column of every field passed in is present in the result, whether or not
 * the member holds a value for it. Callers derive the CSV header from a single
 * row, so a key omitted here is a column dropped from the whole export.
 */
export function csvCellsForFields(
  fields: readonly CsvField[],
  values: NamespacedValues,
): Record<string, string> {
  const cells: Record<string, string> = {};

  for (const field of fields) {
    const value = values[field.namespace]?.[field.key];
    const subFields = subFieldsOf(field.type);
    const column = columnFor(field);

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
 * The inverse of `csvCellsForFields`: read a row's custom field cells into the values a
 * member write takes. Only the passed fields are read, so a column naming no active field
 * is dropped rather than erroring.
 *
 * `decodeCell` turns a raw cell into its value; it defaults to identity. The caller owns
 * any de-serialization the specific file needs — the members importer passes one that
 * strips the export's formula guard — so this stays pure vocabulary and holds no knowledge
 * of how any particular CSV escapes its cells.
 *
 * A field is written only from a non-blank cell; a blank or absent cell leaves the
 * existing value untouched, not cleared — matching how the importer keeps a blank name or
 * note, so re-importing a partly-filled export can't wipe values a publisher didn't
 * touch. A composite whose every cell is blank is omitted too, because the export writes
 * "no address" and an all-blank address identically; one with any filled cell is read
 * from its non-blank cells and validated whole (a malformed sub-field fails the row).
 * No sub-field is required, so a row carrying only some of an address reads as only
 * those sub-fields. A blank sub-field cell reads as no data for that sub-field, the
 * same way a blank cell reads as no data for a whole field.
 */
export function fieldValuesFromCsvRow(
  fields: readonly CsvField[],
  row: Record<string, unknown>,
  decodeCell: (cell: string) => string = (cell) => cell,
): NamespacedValues {
  const values: NamespacedValues = {};
  const set = (field: CsvField, value: unknown) => {
    values[field.namespace] = { ...values[field.namespace], [field.key]: value };
  };

  // The parser only ever sets a string cell for these columns, so a non-string is an
  // absent column, read as untouched.
  for (const field of fields) {
    const column = columnFor(field);
    const subFields = subFieldsOf(field.type);

    if (!subFields) {
      const cell = row[column];
      if (typeof cell === 'string') {
        const decoded = decodeCell(cell);
        if (!isBlank(decoded)) {
          set(field, decoded);
        }
      }
      continue;
    }

    let anyColumnPresent = false;
    const composite: Record<string, string> = {};
    for (const sub of subFields) {
      const cell = row[`${column}${SEPARATOR}${sub}`];
      if (typeof cell !== 'string') {
        continue;
      }
      anyColumnPresent = true;
      const decoded = decodeCell(cell);
      if (!isBlank(decoded)) {
        composite[sub] = decoded;
      }
    }

    if (anyColumnPresent && Object.keys(composite).length > 0) {
      set(field, composite);
    }
  }

  return values;
}
