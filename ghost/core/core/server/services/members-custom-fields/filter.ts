// The members filter reaches custom field values through a `custom_fields` relation
// on the Member model (the values table joined on member_id). A field is named by
// its `key` — the stable public slug — and matched on its `value`; a composite
// field's part is named as `value.<part>`:
//
//   (custom_fields.key:'company'+custom_fields.value:'Ghost')
//   (custom_fields.key:'shipping-address'+custom_fields.value.country:'GB')
//   custom_fields.key:'phone'                      // is set
//   custom_fields.key:-'phone'                     // is not set
//
// The values table stores one row per leaf: `custom_field_id` (the field), `path`
// (empty for a scalar, the part's key for a composite), and `value_text`. The public
// grammar names none of that — `key`/`value[.part]` is the vocabulary a saved segment
// keeps. This transformer maps the grammar onto the columns just before the query is
// built, and collapses the `(key + value)` pair into a single-row `$elemMatch` so both
// conditions match the same leaf (not a member whose company row is Acme but who
// happens to hold Ghost on some other field). The field is addressed publicly by its
// immutable key but stored by id, so the caller passes in the key→id map to resolve
// against; a key that no longer resolves (its field was deleted) matches nothing.
const RELATION = 'custom_fields';
const PREFIX = `${RELATION}.`;
const KEY_ATTRIBUTE = `${PREFIX}key`;
const VALUE_ATTRIBUTE = `${PREFIX}value`;
const ROOT_PATH = '';

// A field id that cannot exist, so a predicate naming a since-deleted field resolves
// to "no such leaf" rather than silently widening the segment.
const NO_SUCH_FIELD = '';

type QueryNode = Record<string, unknown>;

// Only recurse into plain objects/arrays; a RegExp, Date, etc. is a leaf value that
// must pass through by reference (recursing would strip a regex to `{}`).
function isPlainObject(value: unknown): value is QueryNode {
    return typeof value === 'object'
        && value !== null
        && !Array.isArray(value)
        && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

// A single-clause object whose one key targets the custom_fields relation.
function isCustomFieldClause(node: unknown): node is QueryNode {
    if (!isPlainObject(node)) {
        return false;
    }
    const keys = Object.keys(node);
    return keys.length === 1 && keys[0].startsWith(PREFIX);
}

// The `(key + value)` compound the UI emits: an $and whose clauses all target the
// relation and include the `key` discriminator. Its clauses describe one leaf row.
function isCustomFieldCompound(clauses: unknown): clauses is QueryNode[] {
    if (!Array.isArray(clauses) || clauses.length < 2 || !clauses.every(isCustomFieldClause)) {
        return false;
    }
    return clauses.some(clause => Object.keys(clause)[0] === KEY_ATTRIBUTE);
}

// `custom_fields.value` addresses the scalar (root) leaf; `custom_fields.value.<part>`
// a composite's part. Returns the row `path` the attribute selects, or null if the
// attribute isn't a value clause.
function pathForValueAttribute(attribute: string): string | null {
    if (attribute === VALUE_ATTRIBUTE) {
        return ROOT_PATH;
    }
    if (attribute.startsWith(`${VALUE_ATTRIBUTE}.`)) {
        return attribute.slice(`${VALUE_ATTRIBUTE}.`.length);
    }
    return null;
}

export function createCustomFieldsFilterTransformer(fieldIdsByKey: Map<string, string>) {
    const resolve = (key: unknown): string => (typeof key === 'string' && fieldIdsByKey.get(key)) || NO_SUCH_FIELD;

    // A `(key + value[.part])` compound becomes one $elemMatch over the leaf: the field
    // resolved to its id, the part as `path`, and the value (with its operator) as
    // `value_text`.
    function toElemMatch(clauses: QueryNode[]): QueryNode {
        const match: QueryNode = {};
        for (const clause of clauses) {
            const [attribute, value] = Object.entries(clause)[0];
            if (attribute === KEY_ATTRIBUTE) {
                match.custom_field_id = resolve(value);
                continue;
            }
            const path = pathForValueAttribute(attribute);
            if (path !== null) {
                match.path = path;
                match.value_text = value;
            }
        }
        return {[RELATION]: {$elemMatch: match}};
    }

    // A standalone `key` clause is field-level is-set / is-not-set: "has any leaf for
    // this field" and its negation. Emitted as a plain relation-column predicate (the
    // dotted form mongo-knex reads), with the operator riding onto the resolved id.
    //
    // A key that no longer resolves (its field was archived or deleted) must match
    // nothing for BOTH operators. is-set falls out naturally — `custom_field_id = ''`
    // is a `IN (…)` over an empty set. is-not-set must NOT keep its `$ne`: that renders
    // `NOT IN (empty)`, which is true for every member and would silently widen the
    // segment to the whole member base. So an unresolved negation drops to the same
    // never-match positive form.
    function aliasKeyClause(value: unknown): QueryNode {
        const column = `${RELATION}.custom_field_id`;
        if (isPlainObject(value) && typeof value.$ne === 'string') {
            const id = fieldIdsByKey.get(value.$ne);
            return id ? {[column]: {$ne: id}} : {[column]: NO_SUCH_FIELD};
        }
        return {[column]: resolve(value)};
    }

    function transform(node: unknown): unknown {
        if (Array.isArray(node)) {
            return node.map(transform);
        }
        if (!isPlainObject(node)) {
            return node;
        }

        if (isCustomFieldCompound(node.$and)) {
            return toElemMatch(node.$and);
        }

        const out: QueryNode = {};
        for (const [key, value] of Object.entries(node)) {
            if (key === KEY_ATTRIBUTE) {
                Object.assign(out, aliasKeyClause(value));
            } else {
                out[key] = transform(value);
            }
        }
        return out;
    }

    return (query: object): object => transform(query) as object;
}

/**
 * The Member filter relation that exposes custom field values. A member has many leaf
 * rows (one per field, or per part of a composite field), and a predicate asks whether
 * one of them matches, so this joins the values table on member_id and mongo-knex emits
 * it as a correlated `members.id IN (…)` subquery — composing with every other member
 * filter. Registered only behind the `membersCustomFields` flag.
 */
export const CUSTOM_FIELDS_RELATION = {
    tableName: 'members_custom_field_values',
    tableNameAs: RELATION,
    type: 'oneToOne',
    joinFrom: 'member_id'
} as const;
