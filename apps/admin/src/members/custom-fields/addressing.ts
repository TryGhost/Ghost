import { z } from 'zod';
import { escapeNqlString } from '@tryghost/nql-string';
import {
  type Identity,
  IdentitySchema,
  IdentityTextSchema,
  PartSchema,
  SEPARATOR,
} from '@tryghost/metafield-types/identity';
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

export function metafieldFieldId(
  field: Pick<Identity, 'namespace' | 'key'>,
): `${typeof METAFIELDS_FIELD_PREFIX}${string}` {
  const identity = z.encode(IdentityTextSchema, {
    namespace: field.namespace,
    key: field.key,
    parts: [],
  });
  return `${METAFIELDS_FIELD_PREFIX}${identity}`;
}

export function parseMetafieldFieldId(id: string): Identity | null {
  if (!id.startsWith(METAFIELDS_FIELD_PREFIX)) {
    return null;
  }
  const identity = z.safeDecode(IdentityTextSchema, id.slice(METAFIELDS_FIELD_PREFIX.length));
  if (!identity.success || identity.data.parts.length > 0) {
    return null;
  }
  return identity.data;
}

/** The field a template's params name, or null when they name none. */
export function fieldFromParams(params: Record<string, string>): Identity | null {
  return IdentitySchema.safeParse(params).data ?? null;
}

function identityOf(field: Pick<Identity, 'namespace' | 'key'>, subfield: string): string | null {
  const parts = z.array(PartSchema).safeParse(subfield ? subfield.split(SEPARATOR) : []);
  if (!parts.success) {
    return null;
  }
  return z.encode(IdentityTextSchema, {
    namespace: field.namespace,
    key: field.key,
    parts: parts.data,
  });
}

function parseIdentityValue(
  raw: unknown,
): (Pick<Identity, 'namespace' | 'key'> & { subfield: string }) | null {
  const identity = typeof raw === 'string' ? z.safeDecode(IdentityTextSchema, raw) : null;
  if (!identity?.success) {
    return null;
  }
  const { namespace, key, parts } = identity.data;
  return { namespace, key, subfield: parts.join(SEPARATOR) };
}

export const CUSTOM_FIELD_SET_OPERATORS = PRESENCE_OPERATORS;

function keyClause(identity: string): string {
  return `${KEY_ATTRIBUTE}:${escapeNqlString(identity)}`;
}

// A predicate's values are the part first, then what it holds: one text, or the
// codes an "is any of" lists. An empty string is no value: a presence pill carries
// one as its value slot, and switching it to "is any of" must not send `['']`.
function readValues(values: unknown[]): { subfield: string; rest: unknown[] } {
  const [subfield, ...rest] = values;

  return {
    subfield: typeof subfield === 'string' ? subfield : '',
    rest: rest.filter((value) => value !== ''),
  };
}

function fieldFromContext(
  bound: Pick<Identity, 'namespace' | 'key'> | undefined,
  params: Record<string, string>,
): Pick<Identity, 'namespace' | 'key'> | null {
  return bound ?? fieldFromParams(params);
}

export function customFieldAddressing(
  bound?: Pick<Identity, 'namespace' | 'key'>,
): PresenceAddressing {
  return {
    presenceOperators: CUSTOM_FIELD_SET_OPERATORS,

    address(predicate, ctx) {
      const field = fieldFromContext(bound, ctx.params);
      const { subfield, rest } = readValues(predicate.values);
      const identity = field && identityOf(field, subfield);

      if (!identity) {
        return null;
      }

      return {
        valueKey: VALUE_ATTRIBUTE,
        companions: [keyClause(identity)],
        values: rest,
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
      const identity = field && identityOf(field, subfield);

      if (!identity) {
        return null;
      }

      if (predicate.operator === 'is-set') {
        return [keyClause(identity)];
      }

      return [`${KEY_ATTRIBUTE}:-${escapeNqlString(identity)}`];
    },

    match() {
      return null;
    },

    matchCompound(node): CompoundMatch | null {
      const ownsIdentity = (candidate: Pick<Identity, 'namespace' | 'key'>) =>
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

      let identity: (Pick<Identity, 'namespace' | 'key'> & { subfield: string }) | undefined;
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
