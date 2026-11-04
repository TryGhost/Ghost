import * as z from 'zod/mini';
import {
  FIELD_STRUCTURES,
  keysOf,
  OPTION_SEPARATOR,
  type FieldShape,
  type FieldType,
  type FieldTypeOfShape,
} from '@tryghost/metafield-types/structure';
import {
  SHAPES,
  shapedType,
  valueFromText,
  type ShapeText,
  type ShapeValue,
  type ShapedType,
} from '@tryghost/metafield-types/shapes';
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
 * part. That shape is derived from the type's own value schema rather than
 * declared alongside it: the two cannot drift, and it stays correct as parts
 * are added, removed, or made optional — an optional part is still a column,
 * it just holds an empty cell more often. A set occupies one column, its options
 * joined by a separator no option can contain, never a column per option.
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

/** A column a field occupies, and which part of the field's value it holds. */
export interface CsvFieldColumn {
  column: string;
  /** The part this column holds, or null where the field's whole value is one column. */
  part: string | null;
}

// Shares csvCellsForFields' column derivation, so a field is written, read, and offered
// as a mapping target under one set of column names.
export function csvColumnsForField(field: CsvField): CsvFieldColumn[] {
  return columnsOf(shapedType(field.type), field);
}

function columnsOf<S extends FieldShape>(
  { shape, type }: ShapedType<S>,
  field: CsvField,
): CsvFieldColumn[] {
  return CSV_SHAPES[shape].columns(field, type);
}

// Spaced on both sides so a cell reads as a list, and split on the separator alone, so a cell
// typed by hand needn't space it.
const joinOptions = (options: readonly unknown[]): string =>
  options.map(toCell).join(` ${OPTION_SEPARATOR} `);

// A spreadsheet runs a cell starting with one of these as a formula, so an export puts an
// apostrophe before such a cell, as the members export does.
const FORMULA_TRIGGERS = ['=', '+', '-', '@', '\t', '\r'];

/**
 * The options a list's cell names, the way an import reads it: past the apostrophe an export puts
 * before a cell that starts the way a formula does, then split on the separator. Read here rather
 * than left to the caller's decoding, since Admin reads list cells too, to suggest a list's options.
 */
export const splitOptions = (cell: string): string[] =>
  (cell.charAt(0) === "'" && FORMULA_TRIGGERS.includes(cell.charAt(1)) ? cell.slice(1) : cell)
    .split(OPTION_SEPARATOR)
    .map((option) => option.trim())
    .filter((option) => option !== '');

export function isMetafieldColumn(column: string): boolean {
  return column === QUALIFIER || column.startsWith(PREFIX);
}

// A missing column and a column present but blank mean different things here, so
// presence has to be detectable. The CSV parser only ever puts strings in these
// cells, which makes "not a string" a reliable stand-in for "no such column".
function cellFor(
  row: Record<string, unknown>,
  field: CsvField,
  part: string | null,
): string | undefined {
  return cellAt(row, columnOf(field, part));
}

function cellAt(row: Record<string, unknown>, column: string): string | undefined {
  const cell = row[column];
  return typeof cell === 'string' ? cell : undefined;
}

export function csvCellsForFields(
  fields: readonly CsvField[],
  values: Record<string, Record<string, unknown> | undefined>,
): Record<string, string> {
  const cells: Record<string, string> = {};
  for (const field of fields) {
    Object.assign(
      cells,
      cellsOf(shapedType(field.type), field, values[field.namespace]?.[field.key]),
    );
  }
  return cells;
}

/**
 * A held value's cells, by column. No value, or one that isn't its field's structure, exports as
 * a blank cell in every column the field occupies.
 */
function cellsOf<S extends FieldShape>(
  { shape, type }: ShapedType<S>,
  field: CsvField,
  raw: unknown,
): Record<string, string> {
  const value = SHAPES[shape].parse(type, raw);
  return value === undefined
    ? Object.fromEntries(CSV_SHAPES[shape].columns(field, type).map(({ column }) => [column, '']))
    : CSV_SHAPES[shape].toCells(field, type, value);
}

/**
 * Whether any of `rows` has a column for one of `fields`, filled in or not. A row read from a
 * CSV can leave out the columns it is too short to reach, so rows are asked until one has.
 */
export function hasFieldColumns(
  fields: readonly CsvField[],
  rows: readonly Record<string, unknown>[],
): boolean {
  const columns = fields.flatMap((field) => csvColumnsForField(field).map(({ column }) => column));
  if (columns.length === 0) {
    return false;
  }
  return rows.some((row) => columns.some((column) => cellAt(row, column) !== undefined));
}

/**
 * The inverse of `csvCellsForFields`: read a row's metafield cells into the values a
 * member write takes. Only the passed fields are read, so a column naming no active
 * field is dropped rather than erroring.
 *
 * `decodeCell` turns a raw cell into its value; it defaults to identity. The caller owns
 * any de-serialization the specific file needs — the members importer passes one that
 * strips the export's formula guard. A list's cell is read past that guard by
 * `splitOptions` as well, which Admin shares to suggest a list's options.
 *
 * A field is written only from a non-blank cell; a blank or absent cell leaves the
 * existing value untouched, not cleared — matching how the importer keeps a blank name or
 * note, so re-importing a partly-filled export can't wipe values a publisher didn't
 * touch. A composite whose every cell is blank is omitted too, because the export writes
 * "no address" and an all-blank address identically; one with any filled cell is read
 * from its non-blank cells and validated whole (a malformed part fails the row). A set's
 * cell is split into its options, so a cell naming none of them is blank too.
 * No part is required, so a row carrying only some of an address reads as only
 * those parts. A blank part's cell reads as no data for that part, the
 * same way a blank cell reads as no data for a whole field.
 */
export function fieldValuesFromCsvRow(
  fields: readonly CsvField[],
  row: Record<string, unknown>,
  decodeCell: (cell: string) => string = (cell) => cell,
): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  for (const field of fields) {
    const cell = (part: string | null) => {
      const raw = cellFor(row, field, part);
      return raw === undefined ? '' : decodeCell(raw);
    };
    const value = valueOf(shapedType(field.type), field, cell);
    if (value !== undefined) {
      values[identityOf(field)] = value;
    }
  }

  return values;
}

/**
 * A row's value for a field, with each leaf read from its cell's text, or undefined when its cells
 * are blank, which the domain reads as holding nothing.
 */
function valueOf<S extends FieldShape>(
  of: ShapedType<S>,
  field: CsvField,
  cell: (part: string | null) => string,
): ShapeValue[S] | undefined {
  return valueFromText(of, CSV_SHAPES[of.shape].fromCells(field, of.type, cell));
}

/** How a field of each shape is laid out in CSV cells. The CSV package's knowledge alone. */
interface CsvShape<S extends FieldShape> {
  /** The columns a field of this shape occupies: one, or one per part. */
  columns(field: CsvField, type: FieldTypeOfShape<S>): CsvFieldColumn[];
  /** A held value's cells, by column. */
  toCells(field: CsvField, type: FieldTypeOfShape<S>, value: ShapeValue[S]): Record<string, string>;
  /**
   * The text a row's cells give, in the shape's structure, blank cells and all. `cell` reads the
   * cell for a part, or for the whole value, decoded and `''` when absent. The domain then reads it
   * as text, and the import passes it through the field's rule.
   */
  fromCells(
    field: CsvField,
    type: FieldTypeOfShape<S>,
    cell: (part: string | null) => string,
  ): ShapeText[S];
}

const CSV_SHAPES: { readonly [S in FieldShape]: CsvShape<S> } = {
  scalar: {
    columns: (field) => [{ column: columnOf(field), part: null }],
    toCells: (field, _type, value) => ({ [columnOf(field)]: toCell(value) }),
    fromCells: (_field, _type, cell) => cell(null),
  },
  record: {
    columns: (field, type) =>
      keysOf(FIELD_STRUCTURES[type].parts).map((part) => ({ column: columnOf(field, part), part })),
    toCells: (field, type, value) =>
      Object.fromEntries(
        keysOf(FIELD_STRUCTURES[type].parts).map((part) => [
          columnOf(field, part),
          toCell(value[part]),
        ]),
      ),
    fromCells: (_field, type, cell) =>
      Object.fromEntries(keysOf(FIELD_STRUCTURES[type].parts).map((part) => [part, cell(part)])),
  },
  set: {
    columns: (field) => [{ column: columnOf(field), part: null }],
    toCells: (field, _type, value) => ({ [columnOf(field)]: joinOptions(value) }),
    fromCells: (_field, _type, cell) => splitOptions(cell(null)),
  },
};
