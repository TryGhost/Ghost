// Translates the metafield clauses of a members filter into a query over the
// values table. A metafield is a publisher-defined field on a member; it is
// addressed as `namespace.key`, and a composite value such as an address names
// one of its parts by appending it: `namespace.key.part`.
//
//   (metafields.identity:'custom.company'+metafields.value:'Ghost')
//   (metafields.identity:'custom.shipping_address.country'+metafields.value:'GB')
//   metafields.identity:'custom.company'                     // has a value
//   metafields.identity:-'custom.shipping_address.country'   // that part is not set
//
// The values table holds one row per stored value: `metafield_namespace`,
// `metafield_key`, `path` (empty for a plain field, the part's name for one part of a
// composite) and `value_text`. A filter addresses those columns directly, so each one
// becomes an $elemMatch over them: positive asserts a matching row exists, and $not
// asserts none does, with no lookup against the field definitions. Which path holds a
// field's whole value is the storage layouts' to say, for every type at once.
import errors from '@tryghost/errors';
import { z } from 'zod';
import { IdentityTextSchema, type Key, type Namespace } from '@tryghost/metafield-types/identity';
import { pathOf, pathsComparable, pathsHolding } from './storage';

const RELATION = 'metafields';
const PREFIX = `${RELATION}.`;
const IDENTITY_ATTRIBUTE = `${PREFIX}identity`;
const VALUE_ATTRIBUTE = `${PREFIX}value`;

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

function isMetafieldClause(node: unknown): node is QueryNode {
  if (!isPlainObject(node)) {
    return false;
  }
  const keys = Object.keys(node);
  return keys.length === 1 && keys[0].startsWith(PREFIX);
}

// A grouped compound: an $and whose clauses all target the relation and name exactly one
// `identity`. Its clauses describe one value row.
//
// Exactly one, not at least one: two whole-field filters ANDed together arrive as a flat
// `identity:'a'+identity:'b'`, since a bare identity clause needs no group of its own. That is two
// filters — a member with a value for both — not one row that is somehow both fields, so
// it has to fall through and be transformed a clause at a time.
function isMetafieldCompound(clauses: unknown): clauses is QueryNode[] {
  if (!Array.isArray(clauses) || clauses.length < 2 || !clauses.every(isMetafieldClause)) {
    return false;
  }
  return clauses.filter((clause) => Object.keys(clause)[0] === IDENTITY_ATTRIBUTE).length === 1;
}

// NQL compiles every negation in this grammar to `{$ne: <string>}`, so a negated clause
// can arrive in no other shape.
function negatedString(value: unknown): string | null {
  return isPlainObject(value) && typeof value.$ne === 'string' ? value.$ne : null;
}

const ANY_PATH = null;

interface Target {
  namespace: Namespace;
  key: Key;
  path: string | typeof ANY_PATH;
}

function targetOf(raw: unknown): Target {
  const identity = typeof raw === 'string' ? z.safeDecode(IdentityTextSchema, raw) : null;
  if (!identity?.success) {
    throw new errors.BadRequestError({
      message: `A metafield filter names a field as namespace.key, for example (${IDENTITY_ATTRIBUTE}:'custom.company'+${VALUE_ATTRIBUTE}:'Ghost').`,
    });
  }
  const { namespace, key, parts } = identity.data;
  return { namespace, key, path: parts.length > 0 ? pathOf(parts) : ANY_PATH };
}

// NQL reads an unquoted number as one, but every value is stored as text, so it is compared as
// the text it was written as.
const Text = z.union([z.string(), z.number().transform(String)]);
const Texts = z.union([Text.transform((text) => [text]), z.array(Text)]);

// The texts an equality names: one, or any of a list (`value:['a','b']`), which NQL compiles to
// `$in`. Null for any other comparison.
function equalTexts(value: unknown): string[] | null {
  const texts = isPlainObject(value) ? Texts.safeParse(value.$in) : Texts.safeParse(value);
  return texts.success ? texts.data : null;
}

// The texts a negated equality names: not one (`$ne`), or none of a list (`$nin`).
function unequalTexts(value: unknown): string[] | null {
  if (!isPlainObject(value)) {
    return null;
  }
  const texts = Texts.safeParse(value.$ne ?? value.$nin);
  return texts.success ? texts.data : null;
}

// One value, or any of several, as a match on one column takes them.
const oneOf = (values: readonly string[]): unknown =>
  values.length === 1 ? values[0] : { $in: values };

export function createMetafieldsFilterTransformer() {
  function rowsOf(target: Target): QueryNode {
    const match: QueryNode = { metafield_namespace: target.namespace, metafield_key: target.key };
    if (target.path !== ANY_PATH) {
      match.path = target.path;
    }
    return match;
  }

  // The rows that hold one of `texts` as the target's value: at its part, or wherever a field's
  // whole value can be kept.
  function rowsHolding(target: Target, texts: readonly string[]): QueryNode {
    return {
      ...rowsOf(target),
      path: oneOf(target.path === ANY_PATH ? pathsHolding(texts) : [target.path]),
      value_text: oneOf(texts),
    };
  }

  const some = (match: QueryNode): QueryNode => ({ [RELATION]: { $elemMatch: match } });
  const none = (match: QueryNode): QueryNode => ({ [RELATION]: { $not: { $elemMatch: match } } });

  function buildElemMatch(target: Target, value: unknown, negate: boolean): QueryNode {
    if (value === undefined) {
      return negate ? none(rowsOf(target)) : some(rowsOf(target));
    }

    const equal = equalTexts(value);
    if (equal) {
      return some(rowsHolding(target, equal));
    }

    // "Is not" is asked of a value that is there: the target holds something, and none of what
    // it holds is one of these. A member holding nothing has no value to compare.
    const unequal = unequalTexts(value);
    if (unequal) {
      return { $and: [some(rowsOf(target)), none(rowsHolding(target, unequal))] };
    }

    // Any other comparison, such as a match on part of the text, is made against the target's
    // part, or wherever a type keeps a whole value such a comparison applies to.
    return some({
      ...rowsOf(target),
      path: target.path ?? oneOf(pathsComparable()),
      value_text: value,
    });
  }

  function toElemMatch(clauses: QueryNode[]): QueryNode {
    let target: Target | undefined;
    let value: unknown;
    let hasValue = false;

    for (const clause of clauses) {
      const [attribute, clauseValue] = Object.entries(clause)[0];

      if (attribute === IDENTITY_ATTRIBUTE) {
        if (negatedString(clauseValue) !== null) {
          throw new errors.BadRequestError({
            message: `A negated "${IDENTITY_ATTRIBUTE}" stands alone; it cannot be grouped with a value.`,
          });
        }
        target = targetOf(clauseValue);
      } else if (attribute === VALUE_ATTRIBUTE) {
        if (hasValue) {
          throw new errors.BadRequestError({
            message: `A metafield filter takes one "${VALUE_ATTRIBUTE}" clause.`,
          });
        }
        hasValue = true;
        value = clauseValue;
      } else {
        throw new errors.BadRequestError({
          message: `Unsupported metafield filter clause "${attribute}".`,
        });
      }
    }

    if (!target) {
      throw new errors.BadRequestError({
        message: `A metafield filter needs a "${IDENTITY_ATTRIBUTE}" clause.`,
      });
    }
    return buildElemMatch(target, hasValue ? value : undefined, false);
  }

  function fromIdentityClause(value: unknown): QueryNode {
    const negated = negatedString(value);
    if (negated !== null) {
      return buildElemMatch(targetOf(negated), undefined, true);
    }
    return buildElemMatch(targetOf(value), undefined, false);
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
      if (key === IDENTITY_ATTRIBUTE) {
        Object.assign(out, fromIdentityClause(value));
      } else if (key.startsWith(PREFIX)) {
        throw new errors.BadRequestError({
          message: `A "${key}" filter must be grouped with its "${IDENTITY_ATTRIBUTE}" clause, for example (${IDENTITY_ATTRIBUTE}:'custom.a_field'+${VALUE_ATTRIBUTE}:'a value').`,
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
 * The Member filter relation that exposes metafield values. A member has many value
 * rows (one per field, or per part of a composite field), and a predicate asks whether
 * one of them matches, so this joins the values table on member_id and mongo-knex emits
 * it as a correlated `members.id IN (…)` subquery — composing with every other member
 * filter.
 */
export const METAFIELDS_RELATION = {
  tableName: 'members_metafield_values',
  tableNameAs: RELATION,
  type: 'oneToOne',
  joinFrom: 'member_id',
} as const;
