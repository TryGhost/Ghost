import { escapeNqlString } from '@tryghost/nql-string';
import {
  PRESENCE_OPERATORS,
  getCompoundChildren,
  readNegatedString,
  toComparator,
} from '@/shared/filters';
import type { CompoundMatch, PresenceAddressing } from '@/shared/filters';

const RELATION = 'metafields';
const KEY_ATTRIBUTE = `${RELATION}.key`;
const VALUE_ATTRIBUTE = `${RELATION}.value`;

/**
 * The qualifier every metafield filter id and column key starts with. The rest of an
 * id is the field's identity — namespace.key — taken from the field itself, so ids
 * follow whatever namespaces the definitions API returns and nothing here assumes
 * which ones exist.
 */
export const METAFIELDS_FIELD_PREFIX = 'metafields.';

export interface MetafieldIdentity {
  namespace: string;
  key: string;
}

/** The filter/column id for one field: the qualifier, then its identity. */
export function metafieldFieldId(field: MetafieldIdentity): string {
  return `${METAFIELDS_FIELD_PREFIX}${field.namespace}.${field.key}`;
}

/** Read a field id back into its identity, or null for an id that is not one. */
export function parseMetafieldFieldId(id: string): MetafieldIdentity | null {
  if (!id.startsWith(METAFIELDS_FIELD_PREFIX)) {
    return null;
  }
  const [namespace, key, ...rest] = id.slice(METAFIELDS_FIELD_PREFIX.length).split('.');
  if (!namespace || !key || rest.length > 0) {
    return null;
  }
  return { namespace, key };
}

// The identity the key clause carries: the field's namespace and key, extended with a
// part path to name one leaf of a composite value.
function identityOf(field: MetafieldIdentity, subfield: string): string {
  const base = `${field.namespace}.${field.key}`;
  return subfield ? `${base}.${subfield}` : base;
}

function parseIdentityValue(
  raw: unknown,
): { namespace: string; key: string; subfield: string } | null {
  if (typeof raw !== 'string') {
    return null;
  }
  const [namespace, key, ...parts] = raw.split('.');
  if (!namespace || !key) {
    return null;
  }
  return { namespace, key, subfield: parts.join('.') };
}

export const CUSTOM_FIELD_SET_OPERATORS = PRESENCE_OPERATORS;

function keyClause(identity: string): string {
  return `${KEY_ATTRIBUTE}:${escapeNqlString(identity)}`;
}

function readValues(values: unknown[]): { subfield: string; value: unknown } {
  const [subfield, value] = values;

  return {
    subfield: typeof subfield === 'string' ? subfield : '',
    value,
  };
}

function fieldFromContext(
  bound: MetafieldIdentity | undefined,
  params: Record<string, string>,
): MetafieldIdentity | null {
  if (bound) {
    return bound;
  }
  if (params.namespace && params.key) {
    return { namespace: params.namespace, key: params.key };
  }
  return null;
}

export function customFieldAddressing(bound?: MetafieldIdentity): PresenceAddressing {
  return {
    presenceOperators: CUSTOM_FIELD_SET_OPERATORS,

    address(predicate, ctx) {
      const field = fieldFromContext(bound, ctx.params);
      const { subfield, value } = readValues(predicate.values);

      if (!field) {
        return null;
      }

      return {
        valueKey: VALUE_ATTRIBUTE,
        companions: [keyClause(identityOf(field, subfield))],
        values: [value],
      };
    },

    // The shape of these clauses is not ours to choose. The members API rewrites them into a
    // single lookup over the rows holding custom field values, and it only accepts two forms:
    // a lone key clause carrying a leaf identity, or a key clause grouped with one value
    // clause. See ghost/core/core/server/services/members-custom-fields/filter.ts.
    //
    // The identity names the leaf, so a part's presence is the bare key clause with the
    // part path in the identity; its negation asks for members with no such leaf at all.
    addressPresence(predicate, ctx) {
      const field = fieldFromContext(bound, ctx.params);
      const { subfield } = readValues(predicate.values);

      if (!field) {
        return null;
      }

      const identity = identityOf(field, subfield);

      if (predicate.operator === 'is-set') {
        return [keyClause(identity)];
      }

      return [`${KEY_ATTRIBUTE}:-${escapeNqlString(identity)}`];
    },

    match() {
      return null;
    },

    matchCompound(node): CompoundMatch | null {
      const ownsIdentity = (candidate: { namespace: string; key: string }) =>
        bound === undefined ||
        (candidate.namespace === bound.namespace && candidate.key === bound.key);

      const children = getCompoundChildren(node, '$and');

      if (!children) {
        const identity = parseIdentityValue(node[KEY_ATTRIBUTE]);

        if (identity) {
          if (!ownsIdentity(identity)) {
            return null;
          }

          return {
            kind: 'predicate',
            predicate: {
              field: metafieldFieldId(identity),
              operator: 'is-set',
              values: [identity.subfield, ''],
            },
          };
        }

        const negated = parseIdentityValue(readNegatedString(node[KEY_ATTRIBUTE]));

        if (negated) {
          if (!ownsIdentity(negated)) {
            return null;
          }

          return {
            kind: 'predicate',
            predicate: {
              field: metafieldFieldId(negated),
              operator: 'is-not-set',
              values: [negated.subfield, ''],
            },
          };
        }

        return null;
      }

      if (children.length !== 2) {
        return null;
      }

      let identity: { namespace: string; key: string; subfield: string } | undefined;
      let valueRaw: unknown;
      let hasValue = false;

      for (const child of children) {
        const parsed = parseIdentityValue(child[KEY_ATTRIBUTE]);
        if (parsed) {
          identity = parsed;
        }
        if (VALUE_ATTRIBUTE in child) {
          valueRaw = child[VALUE_ATTRIBUTE];
          hasValue = true;
        }
      }

      if (!identity || !hasValue || !ownsIdentity(identity)) {
        return null;
      }

      const comparator = toComparator(valueRaw);

      if (!comparator) {
        return null;
      }

      return {
        kind: 'value',
        field: metafieldFieldId(identity),
        leadingValues: [identity.subfield],
        comparator,
      };
    },
  };
}
