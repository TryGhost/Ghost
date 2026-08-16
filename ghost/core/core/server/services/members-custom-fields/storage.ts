import errors from '@tryghost/errors';

// A value is a tree; the database stores one row per leaf, under the path addressing it.
// A value with no parts is a single leaf at the root, a part is a leaf under its key, and
// a nested part is addressed with a dotted path.
//
// Nothing here may consult a field type. Values arrive already parsed against their own,
// and rows are rebuilt as what they were written as rather than as what the type says
// today, so a type that changes shape does not rewrite what members already have.

/** Also the notation a segment filter addresses a part by, so the two cannot drift. */
const SEPARATOR = '.';

/** Empty rather than null: a unique index does not constrain nulls, which would let the same leaf be stored twice. */
export const ROOT_PATH = '';

export interface Leaf {
    path: string;
    value_text: string;
}

export interface StoredLeaf extends Leaf {
    member_id: string;
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

/** Every leaf a value names, at any depth, including the ones it names as empty. */
export function leavesFor(value: unknown, path: string = ROOT_PATH): Leaf[] {
    if (typeof value === 'string') {
        return [{path, value_text: value}];
    }

    // Thrown rather than stored: the read path rejects a non-string row, so writing one
    // loses the value with nothing to say it ever arrived.
    if (!isRecord(value)) {
        throw new errors.IncorrectUsageError({
            message: `A custom field value must be a string or a record of them, not ${value === null ? 'null' : typeof value}.`
        });
    }

    // Undefined means the value does not name the part, which is not the same as naming
    // it empty: the first leaves what is stored alone, the second clears it.
    return Object.entries(value)
        .filter(([, part]) => part !== undefined)
        .flatMap(([key, part]) => leavesFor(part, path === ROOT_PATH ? key : `${path}${SEPARATOR}${key}`));
}

/** A value split into the leaves it sets and the paths it clears. */
export function leavesToWrite(value: unknown): {set: Leaf[], cleared: string[]} {
    const named = leavesFor(value);

    return {
        set: named.filter(leaf => leaf.value_text !== ''),
        cleared: named.filter(leaf => leaf.value_text === '').map(leaf => leaf.path)
    };
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
        // A segment already holding a string is replaced rather than descended into: this
        // runs over every member of a list response, so a contradictory pair of paths
        // should cost one odd value rather than the whole response.
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

/** Every member's values, keyed by member and then field key; a member with no rows is absent. */
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
