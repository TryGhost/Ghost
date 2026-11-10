import { createHash } from 'node:crypto';
import errors from '@tryghost/errors';
import {
  FIELD_READING,
  FIELD_STRUCTURES,
  LEAVES,
  SHAPES,
  keysOf,
  shaped,
  type Accepted,
  type AcceptedValue,
  type AnyLeafValue,
  type FieldOfShape,
  type FieldShape,
  type Leaf,
  type ShapeValue,
  type ShapedField,
  type TypedSettings,
  type ValueKind,
  type ValueOfKind,
} from '@tryghost/metafield-types';
import { type Part, SEPARATOR } from '@tryghost/metafield-types/identity';

/** Empty rather than null, because the path is part of a value row's primary key. */
export const ROOT_PATH = '';

/** The path the value of these parts is stored under, written the way an identity writes them. */
export function pathOf(parts: readonly Part[]): string {
  return parts.join(SEPARATOR);
}

/**
 * The columns a row keeps its value in: one column per kind of value, so the database compares each
 * kind as itself.
 */
export interface ValueColumns {
  value_text: string;
}
export type ValueColumn = keyof ValueColumns;

/** A row's value, at its path. */
export type ValueRow = { path: string } & ValueColumns;

/** Where storage keeps one kind of value. */
interface StoredKind<K extends ValueKind> {
  /** The column a value of this kind is kept, and compared, in. */
  readonly column: ValueColumn;
  /** Whether a value, or a filter's operand, is of this kind. */
  is(value: unknown): value is ValueOfKind<K>;
  /** The columns a value of this kind is written as. */
  columns(value: ValueOfKind<K>): ValueColumns;
}

/**
 * Where storage keeps each kind of value the catalog's leaves come in, which writing a value,
 * reading one back and a filter's comparison against one value all go by. Keyed by those kinds, so
 * a leaf whose value is a new kind fails to compile here until the kind has a column.
 */
const VALUE_KINDS: { readonly [K in ValueKind]: StoredKind<K> } = {
  string: {
    column: 'value_text',
    is: (value): value is string => typeof value === 'string',
    columns: (value) => ({ value_text: value }),
  },
};

/** Every column a value can be kept in, which the values table has to have. */
export const VALUE_COLUMNS: readonly ValueColumn[] = keysOf(VALUE_KINDS).map(
  (kind) => VALUE_KINDS[kind].column,
);

/** The columns a value is written as, when it is of `kind`. */
function columnsAs<K extends ValueKind>(kind: K, value: unknown): ValueColumns | undefined {
  const stored = VALUE_KINDS[kind];
  return stored.is(value) ? stored.columns(value) : undefined;
}

/** The columns a leaf's value is written as, by its kind. */
function valueColumns(value: AnyLeafValue): ValueColumns {
  for (const kind of keysOf(VALUE_KINDS)) {
    const columns = columnsAs(kind, value);
    if (columns) {
      return columns;
    }
  }
  // Unreachable while `VALUE_KINDS` is keyed by every kind a leaf's value comes in.
  throw new errors.InternalServerError({ message: 'A custom field value of an unknown kind.' });
}

/** A row's value, read from the column its leaf's kind of value is kept in. */
const leafFrom = (leaf: Leaf, row: ValueRow): AnyLeafValue =>
  row[VALUE_KINDS[LEAVES[leaf.leaf].kind].column];

/** The text a set keeps an option under, from a row that holds one at the option's path. */
const optionTextOf = (row: Pick<ValueRow, 'path' | 'value_text'>): string | undefined =>
  row.path === optionPath(row.value_text) ? row.value_text : undefined;

/**
 * The column a filter's comparison is made in: that of the kind every value it compares with is
 * of, as NQL types them, or text, which a match on part of a value always is.
 */
export function valueColumnFor(comparison: unknown): ValueColumn {
  const operands =
    typeof comparison === 'object' && comparison !== null && !Array.isArray(comparison)
      ? Object.values(comparison).flat()
      : [comparison];
  const kind = keysOf(VALUE_KINDS).find(
    (candidate) =>
      operands.length > 0 && operands.every((operand) => VALUE_KINDS[candidate].is(operand)),
  );
  return VALUE_KINDS[kind ?? 'string'].column;
}

/**
 * The path a set keeps an option under: the SHA-256 of its text, in hex, so the same text is
 * always the same row, and a filter naming an option's text finds the row by the table's key.
 * Hashed rather than the text itself because a path is part of that key, which has a length limit
 * an option's text could pass, and because MySQL compares keys ignoring case and accents where
 * SQLite does not, so the text as a key would make "Café" and "cafe" one option on one database
 * and two on the other.
 */
export function optionPath(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export type StoredValueRow = ValueRow & {
  member_id: string;
  namespace: string;
  key: string;
};

/**
 * What a write does to a field's rows: a scalar or record merges, setting the rows it names and
 * clearing only the paths it names as `null`, and a set replaces, leaving only the rows it sets.
 */
export type RowsToWrite =
  | { mode: 'merge'; set: ValueRow[]; cleared: string[] }
  | { mode: 'replace'; set: ValueRow[] };

/**
 * How Ghost keeps a value of each shape in rows: storage's knowledge alone, which the domain never
 * sees. Each entry must agree with its shape's rules: the changes a write makes to the rows of a
 * held value read back as `SHAPES[shape].apply` says.
 */
interface StoredShape<S extends FieldShape> {
  /** What writing an accepted value does to the field's rows. */
  changesFor(value: Accepted<S>): RowsToWrite;
  /**
   * The structure a field's rows hold, checking only their layout, or undefined when none of them
   * is there. A row outside the layout is left out, and `leftOut` is called. The field's
   * `FIELD_READING` entry then gives the value its meaning.
   */
  valueFrom(
    rows: readonly ValueRow[],
    field: FieldOfShape<S>,
    leftOut: () => void,
  ): ShapeValue[S] | undefined;
}

/** Rows that set a value, and the paths of the ones named as `null`, which clear one. */
function mergedRows(
  named: ReadonlyArray<{ path: string; value: AnyLeafValue | null }>,
): RowsToWrite {
  return {
    mode: 'merge',
    set: named.flatMap(({ path, value }) =>
      value === null ? [] : [{ path, ...valueColumns(value) }],
    ),
    cleared: named.flatMap(({ path, value }) => (value === null ? [path] : [])),
  };
}

// A value with parts is laid out as a row per part at the part's name, and a value without as one
// row at the root. A set is one row per option picked, each under a path its text gives. Reading a
// field's rows back, writing a value's, and finding a value a filter names all follow the layouts
// here, so a shape added to the catalog is laid out once, in this table.
const STORED: { readonly [S in FieldShape]: StoredShape<S> } = {
  scalar: {
    changesFor: (value) => mergedRows([{ path: ROOT_PATH, value }]),
    valueFrom: (rows, { type }, leftOut) => {
      const root = rows.find((row) => row.path === ROOT_PATH);
      if (rows.length > (root ? 1 : 0)) {
        leftOut();
      }
      return root && SHAPES.scalar.parse(type, leafFrom(FIELD_STRUCTURES[type].leaf, root));
    },
  },
  record: {
    // A part the value doesn't name is left out of both lists, which is how "leave it alone" is
    // said: by saying nothing about it.
    changesFor: (value) =>
      mergedRows(
        Object.entries(value).flatMap(([part, held]) =>
          held === undefined ? [] : [{ path: part, value: held }],
        ),
      ),
    // The declared rows are read whatever else sits beside them, because a write names only
    // declared paths and so can never remove a stray row. Hiding a value for one would hide it for
    // good, however often staff saved the field again.
    valueFrom: (rows, { type }, leftOut) => {
      const parts: Readonly<Record<string, Leaf | undefined>> = FIELD_STRUCTURES[type].parts;
      const declared = rows.flatMap((row) => {
        const leaf = Object.prototype.hasOwnProperty.call(parts, row.path)
          ? parts[row.path]
          : undefined;
        return leaf === undefined ? [] : [[row.path, leafFrom(leaf, row)]];
      });
      if (declared.length < rows.length) {
        leftOut();
      }
      // Parsed as the type's value rather than assembled as one, so only its declared parts, each
      // of its leaf's kind, can come back.
      return SHAPES.record.parse(type, Object.fromEntries(declared));
    },
  },
  set: {
    changesFor: (value) => ({
      mode: 'replace',
      set: value.map((text) => ({ path: optionPath(text), ...valueColumns(text) })),
    }),
    valueFrom: (rows, _field, leftOut) => {
      const declared = rows.flatMap((row) => optionTextOf(row) ?? []);
      if (declared.length < rows.length) {
        leftOut();
      }
      return declared.length > 0 ? declared : undefined;
    },
  },
};

/** The changes to a field's rows that writing an accepted value makes. */
export function valueRowsToWrite<S extends FieldShape>({
  shape,
  value,
}: AcceptedValue<S>): RowsToWrite {
  return STORED[shape].changesFor(value);
}

/**
 * What a field holds, read from its rows in the layout its shape keeps, then read as the field
 * gives it meaning. Only the layout is checked, not the field's rule, so tightening a rule later
 * never hides values members already hold.
 */
export function storedValueAs(
  field: TypedSettings,
  rows: readonly ValueRow[],
  leftOut: () => void,
): unknown {
  return readAs(shaped(field), rows, leftOut);
}

function readAs<S extends FieldShape>(
  { shape, field }: ShapedField<TypedSettings, S>,
  rows: readonly ValueRow[],
  leftOut: () => void,
): ShapeValue[S] | undefined {
  const value = STORED[shape].valueFrom(rows, field, leftOut);
  return value === undefined ? undefined : FIELD_READING[shape].held(field, value);
}

/**
 * The text of each option in `rows`, given one row per option. A row counts only when its path is
 * the path a set keeps that option at. The texts are sorted, so the filter offers them in the same
 * order every time.
 */
export function heldOptionTexts(
  rows: ReadonlyArray<Pick<ValueRow, 'path' | 'value_text'>>,
): string[] {
  return rows
    .flatMap((row) => optionTextOf(row) ?? [])
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/**
 * Where each shape keeps a row whose text is its field's whole value, given that text, or null for
 * a shape whose whole value is never the text of one row.
 */
const WHOLE_VALUE_PATH: { [S in FieldShape]: ((text: string) => string) | null } = {
  scalar: () => ROOT_PATH,
  record: null,
  set: optionPath,
};

/**
 * Every path a row holding one of `texts` as its field's whole value can be at, whatever the
 * field's type. A filter names a field and a value but not the field's type, so it looks wherever
 * a type could keep that value.
 */
export function pathsHolding(texts: readonly string[]): string[] {
  const paths = Object.values(WHOLE_VALUE_PATH).flatMap((pathOfText) =>
    pathOfText ? texts.map(pathOfText) : [],
  );
  return [...new Set(paths)];
}

/**
 * Every member's values, keyed by member, then namespace, then field key. `valueOf` gets one of a
 * field's rows, to say which field it is, and all of them, and returns what the field holds; a
 * field it returns undefined for is left out, and so is a namespace or member left with nothing.
 */
export function valuesFromRows<Row extends StoredValueRow>(
  rows: readonly Row[],
  valueOf: (row: Row, rows: readonly ValueRow[]) => unknown,
): Map<string, Record<string, Record<string, unknown>>> {
  type FieldRows = { row: Row; rows: ValueRow[] };
  const byMember = new Map<string, Map<string, Map<string, FieldRows>>>();

  for (const row of rows) {
    const { member_id: memberId, namespace, key } = row;
    const namespaces = byMember.get(memberId) ?? new Map<string, Map<string, FieldRows>>();
    const fields = namespaces.get(namespace) ?? new Map<string, FieldRows>();
    const forField: FieldRows = fields.get(key) ?? { row, rows: [] };
    forField.rows.push(row);
    fields.set(key, forField);
    namespaces.set(namespace, fields);
    byMember.set(memberId, namespaces);
  }

  const values = new Map<string, Record<string, Record<string, unknown>>>();
  for (const [memberId, namespaces] of byMember) {
    const held: Record<string, Record<string, unknown>> = {};
    for (const [namespace, fields] of namespaces) {
      const inNamespace = Object.fromEntries(
        [...fields].flatMap(([key, forField]) => {
          const value = valueOf(forField.row, forField.rows);
          return value === undefined ? [] : [[key, value]];
        }),
      );
      if (Object.keys(inNamespace).length > 0) {
        held[namespace] = inNamespace;
      }
    }
    if (Object.keys(held).length > 0) {
      values.set(memberId, held);
    }
  }
  return values;
}
