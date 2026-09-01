import { escapeNqlString } from '@tryghost/nql-string';
import { formatIdentity, parseIdentity } from '@tryghost/custom-field-types/identity';
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

export const METAFIELDS_FIELD_PREFIX = 'metafields.';

export interface MetafieldIdentity {
  namespace: string;
  key: string;
}

export function metafieldFieldId(
  field: MetafieldIdentity,
): `${typeof METAFIELDS_FIELD_PREFIX}${string}` {
  return `${METAFIELDS_FIELD_PREFIX}${field.namespace}.${field.key}`;
}

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

function identityOf(field: MetafieldIdentity, subfield: string): string {
  return formatIdentity({ namespace: field.namespace, key: field.key, partPath: subfield || null });
}

function parseIdentityValue(
  raw: unknown,
): { namespace: string; key: string; subfield: string } | null {
  const identity = typeof raw === 'string' ? parseIdentity(raw) : null;
  if (!identity) {
    return null;
  }
  return { namespace: identity.namespace, key: identity.key, subfield: identity.partPath ?? '' };
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

    // The shape of these clauses is not ours to choose. Ghost's members endpoint rewrites them
    // into a single lookup over the table holding custom-field values, and accepts only two
    // forms: a key clause alone, or a key clause grouped with exactly one value clause. The
    // key names the exact leaf — namespace, key, and for a multi-part value the part — so a
    // part's presence is the bare key clause for that leaf, and its negation asks for members
    // with no such leaf stored.
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
