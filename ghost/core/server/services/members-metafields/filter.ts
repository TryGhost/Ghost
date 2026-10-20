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
// The values table holds one row per stored value: `metafield_key`, `path`
// (empty for a plain field, the part's name for one part of a composite) and
// `value_text`. A filter addresses those columns directly, so each one becomes a
// single $elemMatch over them — positive asserts a matching row exists, $not
// asserts none does — with no lookup against the field definitions.
import errors from '@tryghost/errors';
import { z } from 'zod';
import { CUSTOM_NAMESPACE, IdentityTextSchema } from '@tryghost/metafield-types/identity';
import { ROOT_PATH, pathOf } from './storage';

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
  key: string;
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
  const path = parts.length > 0 ? pathOf(parts) : ANY_PATH;
  // A stored key never contains a dot, so the identity written out whole is a key no stored
  // row can equal.
  if (namespace !== CUSTOM_NAMESPACE) {
    return { key: z.encode(IdentityTextSchema, identity.data), path };
  }
  return { key, path };
}

export function createMetafieldsFilterTransformer() {
  // One (maybe-negated) $elemMatch over the value row columns: positive is "a row pinned
  // by these matches", `$not` is "no row does".
  function buildElemMatch(target: Target, value: unknown, negate: boolean): QueryNode {
    const match: QueryNode = { metafield_key: target.key };
    if (value !== undefined) {
      match.path = target.path ?? ROOT_PATH;
      match.value_text = value;
    } else if (target.path !== ANY_PATH) {
      match.path = target.path;
    }
    if (negate) {
      return { [RELATION]: { $not: { $elemMatch: match } } };
    }
    return { [RELATION]: { $elemMatch: match } };
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
