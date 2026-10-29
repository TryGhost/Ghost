import { createHash } from 'node:crypto';
import errors from '@tryghost/errors';
import {
  FIELD_STRUCTURES,
  matchField,
  type FieldShape,
  type SetSettings,
  type TypedSettings,
} from '@tryghost/metafield-types';
import { type Part, SEPARATOR } from '@tryghost/metafield-types/identity';

// How a value is laid out in rows, for every shape a type can have: a value is a tree, stored as
// one row per leaf under the path of parts that leads to it, and a value with no parts is one row
// at the root. A set is one row per option picked, each under a path its text gives. Reading a
// field's rows back, writing a value's, and finding a value a filter names all follow the layouts
// here, so a shape added to the catalog is laid out once, in this file.

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
 * The path a set keeps an option under: the SHA-256 of its text, in hex, so the same text is
 * always the same row, and a filter naming an option's text finds the row by the table's key.
 * Hashed rather than the text itself because a path is part of that key, which has a length limit
 * an option's text could pass, and because MySQL compares keys ignoring case and accents where
 * SQLite does not, so the text as a key would make "Café" and "cafe" one option on one database
 * and two on the other.
 */
export function optionPath(text: string): string {
  const known = OPTION_PATHS.get(text);
  if (known !== undefined) {
    return known;
  }
  if (OPTION_PATHS.size >= MAX_OPTION_PATHS) {
    OPTION_PATHS.clear();
  }
  const path = createHash('sha256').update(text).digest('hex');
  OPTION_PATHS.set(text, path);
  return path;
}

// A read of a whole list or export checks the path of every option row, and a site's options are
// few, so each text is hashed once. The bound is for texts that only ever appeared in filters.
const OPTION_PATHS = new Map<string, string>();
const MAX_OPTION_PATHS = 10000;

// Each field's options in its order, worked out once per read of its settings rather than per
// member.
const OPTION_RANKS = new WeakMap<SetSettings, Map<string, number>>();

function optionRanks(settings: SetSettings): Map<string, number> {
  const known = OPTION_RANKS.get(settings);
  if (known) {
    return known;
  }
  const ranks = new Map(settings.options.map((option, index) => [option, index]));
  OPTION_RANKS.set(settings, ranks);
  return ranks;
}

/**
 * A value as rows describe it: a string, parts that are trees themselves, or the texts of the
 * options a set picks. Every rule must parse to one of these, so a type whose value isn't one
 * fails to compile where writes are stored. An undefined part is one the value doesn't name, which
 * a write leaves unchanged.
 */
export type ValueTree = string | { readonly [part: string]: ValueTree | undefined };
export type StorableValue = ValueTree | readonly string[];

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

/**
 * A value split into the rows it sets and what else it does to the field's rows, as its shape
 * decides: a scalar or record merges, clearing only the paths it names as empty, and a set
 * replaces, leaving only the rows it sets.
 */
export type RowsToWrite =
  | { mode: 'merge'; set: ValueRow[]; cleared: string[] }
  | { mode: 'replace'; set: ValueRow[] };

// `Array.isArray` narrows a mutable array but not a readonly one, which a set's value is.
const isOptionList = (value: StorableValue): value is readonly string[] => Array.isArray(value);

// A value of the wrong layout for its field never passed the field's rule, so it is a fault here
// rather than a refusal to report.
function misshapenWrite(): never {
  throw new errors.IncorrectUsageError({
    message: 'A metafield value was written in a layout its type does not keep.',
  });
}

function mergedRows(value: StorableValue): RowsToWrite {
  if (isOptionList(value)) {
    return misshapenWrite();
  }
  const named = valueRowsOf(value);
  return {
    mode: 'merge',
    set: named.filter((row) => row.value_text !== ''),
    cleared: named.filter((row) => row.value_text === '').map((row) => row.path),
  };
}

export function valueRowsToWrite(field: TypedSettings, value: StorableValue): RowsToWrite {
  return matchField<TypedSettings, RowsToWrite>(field, {
    scalar: () => mergedRows(value),
    record: () => mergedRows(value),
    set: () =>
      isOptionList(value)
        ? {
            mode: 'replace',
            set: value.map((text) => ({ path: optionPath(text), value_text: text })),
          }
        : misshapenWrite(),
  });
}

/**
 * What a field holds, read from its rows in the layout its type declares: a scalar's row at the
 * root, a record's rows at its declared parts, or a set's rows each at the path its text gives,
 * listed in the order the field offers its options and then any it no longer offers. Undefined
 * when none of them is there. A row anywhere else is left out, and `leftOut` is called. No write
 * through the values service stores one, and a client couldn't draw it.
 *
 * The declared rows are read whatever else sits beside them, because a write names only declared
 * paths and so can never remove a stray row. Hiding a value for one would hide it for good,
 * however often staff saved the field again.
 *
 * Only the layout is checked, not the type's rule, so tightening a rule later never hides values
 * members already hold.
 */
export function storedValueAs(
  field: TypedSettings,
  rows: readonly ValueRow[],
  leftOut: () => void,
): unknown {
  return matchField<TypedSettings, unknown>(field, {
    scalar: () => {
      const root = rows.find((row) => row.path === ROOT_PATH);
      if (rows.length > (root ? 1 : 0)) {
        leftOut();
      }
      return root?.value_text;
    },
    record: ({ type }) => {
      const { parts } = FIELD_STRUCTURES[type];
      const declared = rows.filter((row) => Object.prototype.hasOwnProperty.call(parts, row.path));
      if (declared.length < rows.length) {
        leftOut();
      }
      return declared.length > 0
        ? Object.fromEntries(declared.map((row) => [row.path, row.value_text]))
        : undefined;
    },
    set: ({ settings }) => {
      const declared = rows.filter((row) => row.path === optionPath(row.value_text));
      if (declared.length < rows.length) {
        leftOut();
      }
      const offered = optionRanks(settings);
      const rank = (text: string) => offered.get(text) ?? offered.size;
      return declared.length > 0
        ? declared
            .map((row) => row.value_text)
            .sort((a, b) => rank(a) - rank(b) || (a < b ? -1 : a > b ? 1 : 0))
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
 * Where each shape keeps a row that a comparison on part of its whole value's text, such as one
 * containing it, can be made against, or null where none can: a record's whole value isn't one
 * text, and a set's options are matched by their whole text.
 */
const PARTIAL_VALUE_PATH: { [S in FieldShape]: string | null } = {
  scalar: ROOT_PATH,
  record: null,
  set: null,
};

/** Every path a comparison on part of a field's whole value can be made against, whatever its type. */
export function pathsComparable(): string[] {
  return Object.values(PARTIAL_VALUE_PATH).flatMap((path) => (path === null ? [] : [path]));
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
