import { z } from 'zod';
import { escapeNqlString } from '@tryghost/nql-string';
import {
  type Identity,
  IdentitySchema,
  IdentityTextSchema,
  PartSchema,
  QUALIFIER,
  SEPARATOR,
} from '@tryghost/metafield-types/identity';
import {
  PRESENCE_OPERATORS,
  getCompoundChildren,
  readNegatedString,
  toComparator,
} from '@/shared/filters';
import type { CompoundMatch, PresenceAddressing } from '@/shared/filters';
import { memberCustomFieldIdentity } from '@tryghost/admin-x-framework/api/member-custom-fields';

const RELATION = 'metafields';
const KEY_ATTRIBUTE = `${RELATION}.key`;
const VALUE_ATTRIBUTE = `${RELATION}.value`;

export const METAFIELDS_FIELD_PREFIX = `${QUALIFIER}${SEPARATOR}` as const;

export function metafieldFieldId(
  field: Pick<Identity, 'namespace' | 'key'>,
): `${typeof METAFIELDS_FIELD_PREFIX}${string}` {
  return `${METAFIELDS_FIELD_PREFIX}${memberCustomFieldIdentity(field)}`;
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

function identityOf(field: Pick<Identity, 'namespace' | 'key'>, part: string): string | null {
  const parts = z.array(PartSchema).safeParse(part ? part.split(SEPARATOR) : []);
  return parts.success ? memberCustomFieldIdentity(field, parts.data) : null;
}

function parseIdentityValue(raw: unknown): Identity | null {
  return typeof raw === 'string' ? (z.safeDecode(IdentityTextSchema, raw).data ?? null) : null;
}

/** The part an identity is about, or '' for the whole field. A filter predicate holds it as its first value. */
export function partOf(identity: Identity): string {
  return identity.parts.join(SEPARATOR);
}

export const CUSTOM_FIELD_SET_OPERATORS = PRESENCE_OPERATORS;

function keyClause(identity: string): string {
  return `${KEY_ATTRIBUTE}:${escapeNqlString(identity)}`;
}

// A predicate's values are the part first, then what it holds: one text, or the
// codes an "is any of" lists. An empty string is no value: a presence pill carries
// one as its value slot, and switching it to "is any of" must not send `['']`.
function readValues(values: unknown[]): { part: string; rest: unknown[] } {
  const [part, ...rest] = values;

  return {
    part: typeof part === 'string' ? part : '',
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
      const { part, rest } = readValues(predicate.values);
      const identity = field && identityOf(field, part);

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
    // key names the exact value — namespace, key, and for a multi-part value the part — so a
    // part's presence is the bare key clause for that value, and its negation asks for members
    // with no such value stored.
    addressPresence(predicate, ctx) {
      const field = fieldFromContext(bound, ctx.params);
      const { part } = readValues(predicate.values);
      const identity = field && identityOf(field, part);

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
              values: [partOf(identity), ''],
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
              values: [partOf(negated), ''],
            },
          };
        }

        return null;
      }

      if (children.length !== 2) {
        return null;
      }

      let identity: Identity | undefined;
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
        leadingValues: [partOf(identity)],
        comparator,
      };
    },
  };
}
