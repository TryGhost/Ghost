import errors from '@tryghost/errors';
import { type Part, SEPARATOR } from '@tryghost/metafield-types/identity';

// A value is a tree; the database stores one row for each part it holds, under the path
// its parts make. A value with no parts is a single row at the root, a part is a row under
// its own name, and a part of a part is a row under both.
//
// Nothing here may consult a field type. Values arrive already parsed against their own,
// and rows are rebuilt as what they were written as rather than as what the type says
// today, so a type that changes shape does not rewrite what members already have.

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

export interface StoredValueRow extends ValueRow {
  member_id: string;
  namespace: string;
  key: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Values are rebuilt into plain objects, so a segment naming something every object
 * already has would reach the prototype instead of the value — and a write through
 * `__proto__` reaches every object in the process. Paths come out of the database, so
 * this holds here rather than trusting whatever put them there.
 */
function isSafeSegment(segment: string): boolean {
  return !(segment in Object.prototype);
}

/** A row for every part a value names, at any depth, including the ones it names as empty. */
export function valueRowsOf(value: unknown, path: string = ROOT_PATH): ValueRow[] {
  if (typeof value === 'string') {
    return [{ path, value_text: value }];
  }

  // Thrown rather than stored: the read path rejects a non-string row, so writing one
  // loses the value with nothing to say it ever arrived.
  if (!isRecord(value)) {
    throw new errors.IncorrectUsageError({
      message: `A custom field value must be a string or a record of them, not ${value === null ? 'null' : typeof value}.`,
    });
  }

  // Undefined means the value does not name the part, which is not the same as naming
  // it empty: the first leaves what is stored alone, the second clears it.
  return Object.entries(value)
    .filter(([, part]) => part !== undefined)
    .flatMap(([key, part]) =>
      valueRowsOf(part, path === ROOT_PATH ? key : `${path}${SEPARATOR}${key}`),
    );
}

/** A value split into the rows it sets and the paths it clears. */
export function valueRowsToWrite(value: unknown): { set: ValueRow[]; cleared: string[] } {
  const named = valueRowsOf(value);

  return {
    set: named.filter((row) => row.value_text !== ''),
    cleared: named.filter((row) => row.value_text === '').map((row) => row.path),
  };
}

/** The value a set of rows adds up to, rebuilt to whatever depth their paths describe. */
export function valueFromRows(rows: readonly ValueRow[]): unknown {
  const root = rows.find((row) => row.path === ROOT_PATH);
  if (root) {
    return root.value_text;
  }

  const value: Record<string, unknown> = {};
  for (const row of rows) {
    const segments = row.path.split(SEPARATOR);
    if (!segments.every(isSafeSegment)) {
      continue;
    }

    const last = segments.pop() as string;
    // A segment already holding a string is replaced rather than descended into: this
    // runs over every member of a list response, so a contradictory pair of paths
    // should cost one odd value rather than the whole response.
    const parent = segments.reduce<Record<string, unknown>>((target, segment) => {
      if (!isRecord(target[segment])) {
        target[segment] = {};
      }
      return target[segment] as Record<string, unknown>;
    }, value);
    parent[last] = row.value_text;
  }

  return value;
}

/**
 * Every member's values, keyed by member, then namespace, then field key. A member with no
 * rows is absent, and so is a namespace they hold nothing in.
 */
export function valuesFromRows(
  rows: readonly StoredValueRow[],
): Map<string, Record<string, Record<string, unknown>>> {
  const byMember = new Map<string, Map<string, Map<string, ValueRow[]>>>();

  for (const { member_id: memberId, namespace, key, path, value_text: valueText } of rows) {
    const namespaces = byMember.get(memberId) ?? new Map<string, Map<string, ValueRow[]>>();
    const fields = namespaces.get(namespace) ?? new Map<string, ValueRow[]>();
    const forField = fields.get(key) ?? [];
    forField.push({ path, value_text: valueText });
    fields.set(key, forField);
    namespaces.set(namespace, fields);
    byMember.set(memberId, namespaces);
  }

  return new Map(
    [...byMember].map(([memberId, namespaces]) => [
      memberId,
      Object.fromEntries(
        [...namespaces].map(([namespace, fields]) => [
          namespace,
          Object.fromEntries([...fields].map(([key, forField]) => [key, valueFromRows(forField)])),
        ]),
      ),
    ]),
  );
}
