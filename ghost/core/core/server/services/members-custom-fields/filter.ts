// The members filter reaches custom field values through a `custom_fields` relation
// on the Member model (the values table joined on member_id). A field is named by its
// `key` — the stable public slug — and matched on its `value`; a composite field's
// part is named as `value.<part>`, and a part's presence as `path.<part>`:
//
//   (custom_fields.key:'company'+custom_fields.value:'Ghost')               // value
//   (custom_fields.key:'shipping_address'+custom_fields.value.country:'GB')
//   custom_fields.key:'phone'  /  custom_fields.key:-'phone'                // field set / not set
//   (custom_fields.key:'shipping_address'+custom_fields.path:'country')     // part set
//   (custom_fields.key:'shipping_address'+custom_fields.path:-'country')    // part not set
//
// The values table stores one row per leaf: `custom_field_key` (the field's stable key),
// `path` (empty for a scalar, the part's key for a composite), and `value_text`. A scalar
// field is just a leaf at path ''; "the field", "a part", and "the whole field" are the
// same thing — a set of leaf rows pinned by (custom_field_key, [path], [value]). So every
// filter is one `$elemMatch` over those columns: positive asserts a matching leaf exists,
// `$not` asserts none does. The public grammar is the storage vocabulary here — the key
// sits on the row — so the transformer emits it straight, with no id lookup and no field
// catalog read. That is what lets the Member model chain it inline on every members query,
// rather than each call site remembering to wire it. A key that names no current field
// matches no leaf; the admin never offers an archived or deleted field in the filter UI,
// though the API leaves them queryable.
import errors from '@tryghost/errors';

const RELATION = 'custom_fields';
const PREFIX = `${RELATION}.`;
const KEY_ATTRIBUTE = `${PREFIX}key`;
const VALUE_ATTRIBUTE = `${PREFIX}value`;
const PATH_ATTRIBUTE = `${PREFIX}path`;
const ROOT_PATH = '';

type QueryNode = Record<string, unknown>;

// Only recurse into plain objects/arrays; a RegExp, Date, etc. is a leaf value that
// must pass through by reference (recursing would strip a regex to `{}`).
function isPlainObject(value: unknown): value is QueryNode {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
  );
}

// A single-clause object whose one key targets the custom_fields relation.
function isCustomFieldClause(node: unknown): node is QueryNode {
  if (!isPlainObject(node)) {
    return false;
  }
  const keys = Object.keys(node);
  return keys.length === 1 && keys[0].startsWith(PREFIX);
}

// A grouped compound: an $and whose clauses all target the relation and name exactly one
// `key`. Its clauses describe one leaf row.
//
// Exactly one, not at least one: two whole-field filters ANDed together arrive as a flat
// `key:'a'+key:'b'`, since a bare key clause needs no group of its own. That is two
// filters — a member with a value for both — not one leaf that is somehow both fields, so
// it has to fall through and be transformed a clause at a time.
function isCustomFieldCompound(clauses: unknown): clauses is QueryNode[] {
  if (!Array.isArray(clauses) || clauses.length < 2 || !clauses.every(isCustomFieldClause)) {
    return false;
  }
  return clauses.filter((clause) => Object.keys(clause)[0] === KEY_ATTRIBUTE).length === 1;
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

export function createCustomFieldsFilterTransformer() {
  // The grammar carries the field key in the clause value; take it as a string,
  // defaulting to one no field can hold so a malformed clause matches nothing.
  const keyOf = (value: unknown): string => (typeof value === 'string' ? value : '');

  // One (maybe-negated) $elemMatch over the leaf columns: positive is "a leaf pinned
  // by these matches", `$not` is "no leaf does".
  function buildElemMatch(fieldKey: string, conditions: QueryNode, negate: boolean): QueryNode {
    const match = { custom_field_key: fieldKey, ...conditions };
    if (negate) {
      return { [RELATION]: { $not: { $elemMatch: match } } };
    }
    return { [RELATION]: { $elemMatch: match } };
  }

  // A `(key + value[.part] | path)` compound. A `value` clause pins the part and its
  // value; a `path` clause pins the part's presence (no value), and a negated path is
  // is-not-set — no such leaf — which negates the whole match.
  function toElemMatch(clauses: QueryNode[]): QueryNode {
    let fieldKey = '';
    let hasKey = false;
    let hasLeaf = false;
    const conditions: QueryNode = {};
    let negate = false;

    const oneLeafOnly = () => {
      if (hasLeaf) {
        throw new errors.BadRequestError({
          message: 'A custom field filter takes one value or path clause.',
        });
      }
      hasLeaf = true;
    };

    for (const clause of clauses) {
      const [attribute, value] = Object.entries(clause)[0];

      if (attribute === KEY_ATTRIBUTE) {
        if (hasKey) {
          throw new errors.BadRequestError({
            message: `A custom field filter takes one "${KEY_ATTRIBUTE}" clause.`,
          });
        }
        hasKey = true;
        fieldKey = keyOf(value);
      } else if (attribute === PATH_ATTRIBUTE) {
        oneLeafOnly();
        const negatedPath = negatedString(value);
        conditions.path = negatedPath ?? value;
        negate = negatedPath !== null;
      } else {
        const path = pathForValueAttribute(attribute);
        if (path === null) {
          // Not the key, a value/value.<part>, or a path: it names no leaf
          // column, so dropping it would silently widen the match to the key
          // alone. Fail closed instead.
          throw new errors.BadRequestError({
            message: `Unsupported custom field filter clause "${attribute}".`,
          });
        }
        oneLeafOnly();
        conditions.path = path;
        conditions.value_text = value;
      }
    }

    return buildElemMatch(fieldKey, conditions, negate);
  }

  // A standalone `key` clause is whole-field is-set / is-not-set: a leaf for this
  // field exists (any part), or none does.
  function fromKeyClause(value: unknown): QueryNode {
    const negatedKey = negatedString(value);
    if (negatedKey !== null) {
      return buildElemMatch(keyOf(negatedKey), {}, true);
    }
    return buildElemMatch(keyOf(value), {}, false);
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
      } else if (key.startsWith(PREFIX)) {
        // A value or path clause only means something paired with its key in one
        // leaf, which arrives as the compound handled above. A `custom_fields.*`
        // clause reaching here is unpaired (or its pair was not grouped), so fail
        // closed rather than pass it to mongo-knex as a column that does not exist.
        throw new errors.BadRequestError({
          message: `A "${key}" filter must be grouped with its "${KEY_ATTRIBUTE}" clause, for example (${KEY_ATTRIBUTE}:'a_field'+${VALUE_ATTRIBUTE}:'a value').`,
        });
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
  joinFrom: 'member_id',
} as const;
