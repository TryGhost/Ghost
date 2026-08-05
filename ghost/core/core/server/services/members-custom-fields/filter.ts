// The members filter reaches custom field values through a `custom_fields` relation
// on the Member model (the values table joined on member_id). A field is named by its
// `key` — the stable public slug — and matched on its `value`; a composite field's
// part is named as `value.<part>`, and a part's presence as `path.<part>`:
//
//   (custom_fields.key:'company'+custom_fields.value:'Ghost')              // value
//   (custom_fields.key:'shipping-address'+custom_fields.value.country:'GB')
//   custom_fields.key:'phone'  /  custom_fields.key:-'phone'               // field set / not set
//   (custom_fields.key:'shipping-address'+custom_fields.path:'country')    // part set
//   (custom_fields.key:'shipping-address'+custom_fields.path:-'country')   // part not set
//
// The values table stores one row per leaf: `custom_field_id` (the field), `path`
// (empty for a scalar, the part's key for a composite), and `value_text`. A scalar
// field is just a leaf at path ''; "the field", "a part", and "the whole field" are
// the same thing — a set of leaf rows pinned by (custom_field_id, [path], [value]).
// So every filter is one `$elemMatch` over those columns: positive asserts a matching
// leaf exists, `$not` asserts none does. The public grammar names none of the storage
// (`key`/`value`/`path` is the vocabulary a saved segment keeps); this transformer
// resolves the immutable key to its stored id and emits the match. A key that no
// longer resolves (its field was archived or deleted) matches nothing — and, crucially,
// is never negated, since a negated empty match would match every member.
import {chainTransformers} from '@tryghost/mongo-utils';

const RELATION = 'custom_fields';
const PREFIX = `${RELATION}.`;
const KEY_ATTRIBUTE = `${PREFIX}key`;
const VALUE_ATTRIBUTE = `${PREFIX}value`;
const PATH_ATTRIBUTE = `${PREFIX}path`;
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

// The compound the UI emits: an $and whose clauses all target the relation and include
// the `key` discriminator. Its clauses describe one leaf row.
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

// The single `{$ne}` shape all negations arrive as (is-not-set on a key or part).
function negatedString(value: unknown): string | null {
    return isPlainObject(value) && typeof value.$ne === 'string' ? value.$ne : null;
}

export function createCustomFieldsFilterTransformer(fieldIdsByKey: Map<string, string>) {
    const resolve = (key: unknown): string => (typeof key === 'string' && fieldIdsByKey.get(key)) || NO_SUCH_FIELD;

    // One (maybe-negated) $elemMatch over the leaf columns: positive is "a leaf pinned
    // by these matches", `$not` is "no leaf does". An unresolved field matches nothing
    // either way, so it is never negated — a negated empty match would match everyone.
    function buildElemMatch(fieldId: string, conditions: QueryNode, negate: boolean): QueryNode {
        const match = {custom_field_id: fieldId, ...conditions};
        if (negate && fieldId !== NO_SUCH_FIELD) {
            return {[RELATION]: {$not: {$elemMatch: match}}};
        }
        return {[RELATION]: {$elemMatch: match}};
    }

    // A `(key + value[.part] | path)` compound. A `value` clause pins the part and its
    // value; a `path` clause pins the part's presence (no value), and a negated path is
    // is-not-set — no such leaf — which negates the whole match.
    function toElemMatch(clauses: QueryNode[]): QueryNode {
        let fieldId = NO_SUCH_FIELD;
        const conditions: QueryNode = {};
        let negate = false;

        for (const clause of clauses) {
            const [attribute, value] = Object.entries(clause)[0];

            if (attribute === KEY_ATTRIBUTE) {
                fieldId = resolve(value);
            } else if (attribute === PATH_ATTRIBUTE) {
                const negatedPath = negatedString(value);
                conditions.path = negatedPath ?? value;
                negate = negatedPath !== null;
            } else {
                const path = pathForValueAttribute(attribute);
                if (path !== null) {
                    conditions.path = path;
                    conditions.value_text = value;
                }
            }
        }

        return buildElemMatch(fieldId, conditions, negate);
    }

    // A standalone `key` clause is whole-field is-set / is-not-set: a leaf for this
    // field exists (any part), or none does.
    function fromKeyClause(value: unknown): QueryNode {
        const negatedKey = negatedString(value);
        if (negatedKey !== null) {
            return buildElemMatch(resolve(negatedKey), {}, true);
        }
        return buildElemMatch(resolve(value), {}, false);
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
                Object.assign(out, fromKeyClause(value));
            } else {
                out[key] = transform(value);
            }
        }
        return out;
    }

    return (query: object): object => transform(query) as object;
}

interface FilterableOptions {
    filter?: string;
    enableCustomFieldsFilter?: boolean;
    mongoTransformer?: (query: object) => object;
}

interface FilterServices {
    values: {getFieldIdsByKey(): Promise<Map<string, string>>};
    labs: {isSet(flag: string): boolean};
}

/**
 * Turn on custom-field filtering for a members query: register the relation (via
 * `enableCustomFieldsFilter`, which filterRelations reads) and chain the transformer
 * that maps the public `key`/`value` grammar onto the storage columns. Mutates
 * `options` in place. A no-op unless the flag is on and the filter actually names a
 * custom field — so a `custom_fields.*` filter with the feature off is left as an
 * unknown relation and rejected. Shared by every path that filters members — browse,
 * CSV export, and bulk edit/destroy — so a saved custom-field segment behaves the same
 * through all of them rather than working only in the list view.
 */
export async function applyCustomFieldsFilter(options: FilterableOptions, {values, labs}: FilterServices): Promise<void> {
    if (!options.filter || !options.filter.includes(PREFIX) || !labs.isSet('membersCustomFields')) {
        return;
    }

    const fieldIdsByKey = await values.getFieldIdsByKey();
    const transformer = createCustomFieldsFilterTransformer(fieldIdsByKey);

    options.enableCustomFieldsFilter = true;
    options.mongoTransformer = options.mongoTransformer
        ? chainTransformers(options.mongoTransformer, transformer)
        : transformer;
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
