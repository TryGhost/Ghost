import errors from '@tryghost/errors';

// How a value becomes rows, and rows become values again.
//
// A value is a tree and the database stores its leaves: one string per leaf, under the
// path that addresses it. A value with no parts is a single leaf at the root; a value
// with parts is one leaf per part, under that part's key; a part that is itself a record
// nests, and its leaves are addressed with a dotted path. A part a member left out gets
// no leaf, so "not set" is the absence of a row rather than a row saying nothing.
//
// Keeping the leaves apart rather than as one blob is what lets a segment filter reach a
// part directly: `path = 'country' AND value_text = 'GB'` is an ordinary predicate over
// indexed columns, where reaching inside a JSON column is not. A dotted path is the same
// vocabulary a filter is written in, so `shipping_address.line1` is the layout rather
// than a translation of it.
//
// Nothing here consults a field type. A value arrives already parsed against its own, so
// a record's keys are exactly the parts that type declares; and a row read back is
// rebuilt as what it was written as rather than as whatever the type says today.

/** Separates the segments of a path, and the notation a filter addresses a part by. */
const SEPARATOR = '.';

/** The path of a value's root — the whole value, for one that has no parts. Empty rather than null: a unique index does not constrain nulls, so nulls would let the same leaf be stored twice. */
export const ROOT_PATH = '';

export interface Leaf {
    path: string;
    value_text: string;
}

/** A leaf as it comes back from the database, still carrying who and what it belongs to. */
export interface StoredLeaf extends Leaf {
    member_id: string;
    key: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Whether a path segment can be a key of a plain object and mean only itself.
 *
 * A rebuilt value is an ordinary object, so a segment naming something every object
 * already has — `__proto__` above all — would reach the prototype instead of the value,
 * and writing through `__proto__` reaches every object in the process. No path written
 * here can contain one, because a path is built from catalog part names; this makes that
 * a property of the codec rather than of its callers, since the paths it rebuilds from
 * come out of the database and only have to get there once.
 *
 * The same rule guards field keys in the definitions service, for the same reason.
 */
function isSafeSegment(segment: string): boolean {
    return !(segment in Object.prototype);
}

/**
 * The leaves a value occupies, at any depth.
 *
 * A part with nothing in it contributes no leaf, which is what keeps "not set" and "set
 * to nothing" one state in storage instead of two that read alike.
 */
export function leavesFor(value: unknown, path: string = ROOT_PATH): Leaf[] {
    if (typeof value === 'string') {
        return value === '' ? [] : [{path, value_text: value}];
    }

    // Anything that is neither a string nor a record has no leaves to be made of. Saying
    // so here rather than storing it: a row whose value is not a string is one the read
    // path rejects and drops, so writing one loses the value silently and for good.
    if (!isRecord(value)) {
        throw new errors.IncorrectUsageError({
            message: `A custom field value must be a string or a record of them, not ${value === null ? 'null' : typeof value}.`
        });
    }

    return Object.entries(value).flatMap(([key, part]) => {
        return leavesFor(part, path === ROOT_PATH ? key : `${path}${SEPARATOR}${key}`);
    });
}

/** The value a set of leaves adds up to, rebuilt to whatever depth their paths describe. */
export function valueFromLeaves(leaves: readonly Leaf[]): unknown {
    const root = leaves.find(leaf => leaf.path === ROOT_PATH);
    if (root) {
        return root.value_text;
    }

    const value: Record<string, unknown> = {};
    for (const leaf of leaves) {
        const segments = leaf.path.split(SEPARATOR);
        if (!segments.every(isSafeSegment)) {
            continue;
        }

        const last = segments.pop() as string;
        // Walk to the record this leaf hangs off, creating the ones in between. A path
        // of one segment leaves this loop untouched and assigns straight onto the value.
        //
        // A segment already holding a string is replaced rather than descended into.
        // Only a path that both is and contains another can produce that, which no
        // value written through here does; rebuilding what the rows describe still
        // beats throwing, because this runs over every member in a list response.
        const parent = segments.reduce<Record<string, unknown>>((target, segment) => {
            if (!isRecord(target[segment])) {
                target[segment] = {};
            }
            return target[segment] as Record<string, unknown>;
        }, value);
        parent[last] = leaf.value_text;
    }

    return value;
}

/**
 * Every member's values, keyed by member and then by field key.
 *
 * The other half of reading: a value is spread across as many rows as it has leaves, so
 * they have to be gathered back together before any of them means anything. A member with
 * no rows is absent from the result rather than present and empty.
 */
export function valuesFromLeaves(leaves: readonly StoredLeaf[]): Map<string, Record<string, unknown>> {
    const byMemberAndField = new Map<string, Map<string, Leaf[]>>();

    for (const {member_id: memberId, key, path, value_text: valueText} of leaves) {
        const fields = byMemberAndField.get(memberId) ?? new Map<string, Leaf[]>();
        const forField = fields.get(key) ?? [];
        forField.push({path, value_text: valueText});
        fields.set(key, forField);
        byMemberAndField.set(memberId, fields);
    }

    const byMember = new Map<string, Record<string, unknown>>();
    for (const [memberId, fields] of byMemberAndField) {
        byMember.set(memberId, Object.fromEntries(
            [...fields].map(([key, forField]) => [key, valueFromLeaves(forField)])
        ));
    }

    return byMember;
}
