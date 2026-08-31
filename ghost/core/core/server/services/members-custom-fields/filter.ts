// The members filter reaches custom field values through a `metafields` relation
// on the Member model (the values table joined on member_id). The key clause carries
// the field's identity — `namespace.key`, extended with a part path to name a leaf of
// a composite — and the value clause matches at exactly that leaf:
//
//   (metafields.key:'custom.company'+metafields.value:'Ghost')                 // value
//   (metafields.key:'custom.shipping_address.country'+metafields.value:'GB')   // part value
//   metafields.key:'custom.company'  /  metafields.key:-'custom.company'       // set / not set
//   metafields.key:'custom.shipping_address.country'                           // part set
//   metafields.key:-'custom.shipping_address.country'                          // part not set
//
// The values table stores one row per leaf: `custom_field_key` (the field's stable key),
// `path` (empty for a scalar, the part's key for a composite), and `value_text`. A leaf
// address names those columns directly — identity.key is the row's key, identity.path the
// row's path — so every filter is one `$elemMatch` over them: positive asserts a matching
// leaf exists, `$not` asserts none does. The transformer emits it straight, with no id
// lookup and no field catalog read, which is what lets the Member model chain it inline
// on every members query rather than each call site remembering to wire it. Only the
// namespace is checked against the registry, failing closed: the storage holds the
// `custom` namespace alone, so any other would otherwise silently match nothing. A key
// that names no current field matches no leaf; the admin never offers an archived or
// deleted field in the filter UI, though the API leaves them queryable.
import errors from '@tryghost/errors';
import { isKnownNamespace, parseIdentity } from '@tryghost/custom-field-types/identity';

const RELATION = 'metafields';
const PREFIX = `${RELATION}.`;
const KEY_ATTRIBUTE = `${PREFIX}key`;
const VALUE_ATTRIBUTE = `${PREFIX}value`;
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

// A single-clause object whose one key targets the metafields relation.
function isMetafieldClause(node: unknown): node is QueryNode {
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
function isMetafieldCompound(clauses: unknown): clauses is QueryNode[] {
  if (!Array.isArray(clauses) || clauses.length < 2 || !clauses.every(isMetafieldClause)) {
    return false;
  }
  return clauses.filter((clause) => Object.keys(clause)[0] === KEY_ATTRIBUTE).length === 1;
}

// The single `{$ne}` shape all negations arrive as (is-not-set on a field or leaf).
function negatedString(value: unknown): string | null {
  return isPlainObject(value) && typeof value.$ne === 'string' ? value.$ne : null;
}

// The columns a leaf address pins. A bare field identity leaves `path` open (any leaf
// of the field); a part path pins it; a value test with no part means the root leaf,
// which is where a scalar's value lives — and where a composite has none, so a value
// test against a bare composite identity correctly matches nothing.
interface LeafTarget {
  key: string;
  path: string | null;
}

function parseLeafAddress(raw: unknown): LeafTarget {
  const identity = typeof raw === 'string' ? parseIdentity(raw) : null;
  if (!identity) {
    throw new errors.BadRequestError({
      message: `A metafield filter names a field as namespace.key, for example (${KEY_ATTRIBUTE}:'custom.company'+${VALUE_ATTRIBUTE}:'Ghost').`,
    });
  }
  if (!isKnownNamespace(identity.namespace)) {
    throw new errors.BadRequestError({
      message: `Unknown metafield namespace "${identity.namespace}".`,
    });
  }
  return { key: identity.key, path: identity.path };
}

export function createCustomFieldsFilterTransformer() {
  // One (maybe-negated) $elemMatch over the leaf columns: positive is "a leaf pinned
  // by these matches", `$not` is "no leaf does".
  function buildElemMatch(target: LeafTarget, value: unknown, negate: boolean): QueryNode {
    const match: QueryNode = { custom_field_key: target.key };
    if (value !== undefined) {
      match.path = target.path ?? ROOT_PATH;
      match.value_text = value;
    } else if (target.path !== null) {
      match.path = target.path;
    }
    if (negate) {
      return { [RELATION]: { $not: { $elemMatch: match } } };
    }
    return { [RELATION]: { $elemMatch: match } };
  }

  // A `(key + value)` compound: the key clause names the leaf, the value clause pins
  // what it holds.
  function toElemMatch(clauses: QueryNode[]): QueryNode {
    let target: LeafTarget | undefined;
    let value: unknown;
    let hasValue = false;

    for (const clause of clauses) {
      const [attribute, clauseValue] = Object.entries(clause)[0];

      if (attribute === KEY_ATTRIBUTE) {
        if (negatedString(clauseValue) !== null) {
          // Negation composes with a bare key clause (no such leaf); paired with a
          // value it would be ambiguous between "no leaf holding this value" and
          // "a leaf holding another", so it does not exist in the grammar.
          throw new errors.BadRequestError({
            message: `A negated "${KEY_ATTRIBUTE}" stands alone; it cannot be grouped with a value.`,
          });
        }
        target = parseLeafAddress(clauseValue);
      } else if (attribute === VALUE_ATTRIBUTE) {
        if (hasValue) {
          throw new errors.BadRequestError({
            message: `A metafield filter takes one "${VALUE_ATTRIBUTE}" clause.`,
          });
        }
        hasValue = true;
        value = clauseValue;
      } else {
        // Anything else names no leaf column, so dropping it would silently widen
        // the match to the key alone. Fail closed instead.
        throw new errors.BadRequestError({
          message: `Unsupported metafield filter clause "${attribute}".`,
        });
      }
    }

    // The compound shape guarantees exactly one key clause, so `target` is set.
    return buildElemMatch(target as LeafTarget, hasValue ? value : undefined, false);
  }

  // A standalone `key` clause is set / not-set for whatever the identity names: the
  // whole field, or one leaf of a composite.
  function fromKeyClause(value: unknown): QueryNode {
    const negatedKey = negatedString(value);
    if (negatedKey !== null) {
      return buildElemMatch(parseLeafAddress(negatedKey), undefined, true);
    }
    return buildElemMatch(parseLeafAddress(value), undefined, false);
  }

  function transform(node: unknown): unknown {
    if (Array.isArray(node)) {
      return node.map(transform);
    }
    if (!isPlainObject(node)) {
      return node;
    }

    if (isMetafieldCompound(node.$and)) {
      return toElemMatch(node.$and);
    }

    const out: QueryNode = {};
    for (const [key, value] of Object.entries(node)) {
      if (key === KEY_ATTRIBUTE) {
        Object.assign(out, fromKeyClause(value));
      } else if (key.startsWith(PREFIX)) {
        // A value clause only means something paired with its key in one leaf,
        // which arrives as the compound handled above. A `metafields.*` clause
        // reaching here is unpaired (or its pair was not grouped), so fail
        // closed rather than pass it to mongo-knex as a column that does not exist.
        throw new errors.BadRequestError({
          message: `A "${key}" filter must be grouped with its "${KEY_ATTRIBUTE}" clause, for example (${KEY_ATTRIBUTE}:'custom.a_field'+${VALUE_ATTRIBUTE}:'a value').`,
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
 * filter.
 */
export const CUSTOM_FIELDS_RELATION = {
  tableName: 'members_custom_field_values',
  tableNameAs: RELATION,
  type: 'oneToOne',
  joinFrom: 'member_id',
} as const;
