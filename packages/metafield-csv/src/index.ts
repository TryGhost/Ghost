import * as z from 'zod/mini';
import { subFieldsOf, type FieldType } from '@tryghost/metafield-types/structure';
import {
  IdentityTextSchema,
  type Key,
  type Namespace,
  PartSchema,
  QUALIFIER,
  SEPARATOR,
} from '@tryghost/metafield-types/identity';

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

const PREFIX = `${QUALIFIER}${SEPARATOR}`;

/** A field definition reduced to what CSV needs to know about it. */
export interface CsvField {
  namespace: Namespace;
  key: Key;
  type: FieldType;
}

// Every row of an export or an import is laid out against the same field objects, so each
// identity is written once per field rather than once per cell.
const written = new WeakMap<CsvField, Map<string | null, string>>();

/** The identity of a field's whole value, or of the one part of it named. */
function identityOf(field: CsvField, part: string | null = null): string {
  const byPart = written.get(field) ?? new Map<string | null, string>();
  written.set(field, byPart);
  let identity = byPart.get(part);
  if (identity === undefined) {
    identity = z.encode(IdentityTextSchema, {
      namespace: field.namespace,
      key: field.key,
      parts: part === null ? [] : [PartSchema.parse(part)],
    });
    byPart.set(part, identity);
  }
  return identity;
}

function columnOf(field: CsvField, part: string | null = null): string {
  return `${PREFIX}${identityOf(field, part)}`;
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
  const subFields = subFieldsOf(field.type);
  return subFields
    ? subFields.map((sub) => ({ column: columnOf(field, sub), subField: sub }))
    : [{ column: columnOf(field), subField: null }];
}

export function isMetafieldColumn(column: string): boolean {
  return column === QUALIFIER || column.startsWith(PREFIX);
}

// A missing column and a column present but blank mean different things here, so
// presence has to be detectable. The CSV parser only ever puts strings in these
// cells, which makes "not a string" a reliable stand-in for "no such column".
function cellFor(
  row: Record<string, unknown>,
  field: CsvField,
  tail: string | null,
): string | undefined {
  const cell = row[columnOf(field, tail)];
  return typeof cell === 'string' ? cell : undefined;
}

export function csvCellsForFields(
  fields: readonly CsvField[],
  values: Record<string, Record<string, unknown> | undefined>,
): Record<string, string> {
  const cells: Record<string, string> = {};

  for (const field of fields) {
    const value = values[field.namespace]?.[field.key];
    const subFields = subFieldsOf(field.type);

    if (!subFields) {
      cells[columnOf(field)] = toCell(value);
      continue;
    }

    const composite = (value ?? {}) as Record<string, unknown>;
    for (const sub of subFields) {
      cells[columnOf(field, sub)] = toCell(composite[sub]);
    }
  }

  return cells;
}

/**
 * The inverse of `csvCellsForFields`: read a row's metafield cells into the values a
 * member write takes. Only the passed fields are read, so a column naming no active
 * field is dropped rather than erroring.
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
): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  for (const field of fields) {
    const subFields = subFieldsOf(field.type);

    if (!subFields) {
      const cell = cellFor(row, field, null);
      if (cell !== undefined) {
        const decoded = decodeCell(cell);
        if (!isBlank(decoded)) {
          values[identityOf(field)] = decoded;
        }
      }
      continue;
    }

    let anyColumnPresent = false;
    const composite: Record<string, string> = {};
    for (const sub of subFields) {
      const cell = cellFor(row, field, sub);
      if (cell === undefined) {
        continue;
      }
      anyColumnPresent = true;
      const decoded = decodeCell(cell);
      if (!isBlank(decoded)) {
        composite[sub] = decoded;
      }
    }

    if (anyColumnPresent && Object.keys(composite).length > 0) {
      values[identityOf(field)] = composite;
    }
  }

  return values;
}
