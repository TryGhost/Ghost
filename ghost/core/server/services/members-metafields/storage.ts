import { matchShape, type FieldShape, type FieldType } from '@tryghost/metafield-types';
import { type Part, SEPARATOR } from '@tryghost/metafield-types/identity';

// How a value is laid out in rows, for every shape a type can have: a value is a tree, stored as
// one row per leaf under the path of parts that leads to it, and a value with no parts is one row
// at the root. Reading a field's rows back, writing a value's, and finding a value a filter names
// all follow the layouts here, so a shape added to the catalog is laid out once, in this file.

/** Empty rather than null, because the path is part of a value row's primary key. */
export const ROOT_PATH = '';

/** The path the value of these parts is stored under, written the way an identity writes them. */
export function pathOf(parts: readonly Part[]): string {
  return parts.join(SEPARATOR);
}

export interface ValueRow {
  path: string;
  value_text: string;
}

/**
 * A value as rows describe it: a string, or parts that are trees themselves. Every rule must parse
 * to one of these, so a type whose value isn't one fails to compile where writes are stored. An
 * undefined part is one the value doesn't name, which a write leaves unchanged.
 */
export type ValueTree = string | { readonly [part: string]: ValueTree | undefined };

export interface StoredValueRow extends ValueRow {
  member_id: string;
  namespace: string;
  key: string;
}

/** A row for every part a value names, at any depth, including the ones it names as empty. */
export function valueRowsOf(value: ValueTree, path: string = ROOT_PATH): ValueRow[] {
  if (typeof value === 'string') {
    return [{ path, value_text: value }];
  }

  // Undefined means the value does not name the part, which is not the same as naming
  // it empty: the first leaves what is stored alone, the second clears it.
  return Object.entries(value).flatMap(([key, part]) =>
    part === undefined
      ? []
      : valueRowsOf(part, path === ROOT_PATH ? key : `${path}${SEPARATOR}${key}`),
  );
}

/** A value split into the rows it sets and the paths it clears. */
export function valueRowsToWrite(value: ValueTree): { set: ValueRow[]; cleared: string[] } {
  const named = valueRowsOf(value);

  return {
    set: named.filter((row) => row.value_text !== ''),
    cleared: named.filter((row) => row.value_text === '').map((row) => row.path),
  };
}

/**
 * What a field holds, read from its rows in the layout its type declares: a scalar's row at the
 * root, or a record's rows at its declared parts. Undefined when none of them is there. A row
 * anywhere else is left out, and `leftOut` is called. No write through the values service stores
 * one, and a client couldn't draw it.
 *
 * The declared rows are read whatever else sits beside them, because a write names only declared
 * paths and so can never remove a stray row. Hiding a value for one would hide it for good,
 * however often staff saved the field again.
 *
 * Only the layout is checked, not the type's rule, so tightening a rule later never hides values
 * members already hold.
 */
export function storedValueAs(
  type: FieldType,
  rows: readonly ValueRow[],
  leftOut: () => void,
): unknown {
  return matchShape<unknown>(type, {
    scalar: () => {
      const root = rows.find((row) => row.path === ROOT_PATH);
      if (rows.length > (root ? 1 : 0)) {
        leftOut();
      }
      return root?.value_text;
    },
    record: ({ parts }) => {
      const declared = rows.filter((row) => Object.prototype.hasOwnProperty.call(parts, row.path));
      if (declared.length < rows.length) {
        leftOut();
      }
      return declared.length > 0
        ? Object.fromEntries(declared.map((row) => [row.path, row.value_text]))
        : undefined;
    },
  });
}

/**
 * Where each shape keeps a row whose text is its field's whole value, given that text, or null for
 * a shape whose whole value is never the text of one row.
 */
const WHOLE_VALUE_PATH: { [S in FieldShape]: ((text: string) => string) | null } = {
  scalar: () => ROOT_PATH,
  record: null,
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
    const { member_id: memberId, namespace, key, path, value_text: valueText } = row;
    const namespaces = byMember.get(memberId) ?? new Map<string, Map<string, FieldRows>>();
    const fields = namespaces.get(namespace) ?? new Map<string, FieldRows>();
    const forField: FieldRows = fields.get(key) ?? { row, rows: [] };
    forField.rows.push({ path, value_text: valueText });
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
