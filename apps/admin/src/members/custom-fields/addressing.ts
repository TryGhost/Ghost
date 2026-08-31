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

export const CUSTOM_FIELD_KEY_PREFIX = 'metafields.custom.';

// The identity the key clause carries: the field's namespace and key, extended with a
// part path to name one leaf of a composite value. Bound to the publisher's namespace
// here because these fields are the publisher's.
function identityOf(fieldKey: string, subfield: string): string {
  return subfield ? `custom.${fieldKey}.${subfield}` : `custom.${fieldKey}`;
}

function parseCustomIdentity(raw: unknown): { key: string; subfield: string } | null {
  if (typeof raw !== 'string') {
    return null;
  }
  const [namespace, key, ...parts] = raw.split('.');
  if (namespace !== 'custom' || !key) {
    return null;
  }
  return { key, subfield: parts.join('.') };
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

export function customFieldAddressing(boundKey?: string): PresenceAddressing {
  return {
    presenceOperators: CUSTOM_FIELD_SET_OPERATORS,

    address(predicate, ctx) {
      const fieldKey = boundKey ?? ctx.params.key;
      const { subfield, value } = readValues(predicate.values);

      if (!fieldKey) {
        return null;
      }

      return {
        valueKey: VALUE_ATTRIBUTE,
        companions: [keyClause(identityOf(fieldKey, subfield))],
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
      const fieldKey = boundKey ?? ctx.params.key;
      const { subfield } = readValues(predicate.values);

      if (!fieldKey) {
        return null;
      }

      const identity = identityOf(fieldKey, subfield);

      if (predicate.operator === 'is-set') {
        return [keyClause(identity)];
      }

      return [`${KEY_ATTRIBUTE}:-${escapeNqlString(identity)}`];
    },

    match() {
      return null;
    },

    matchCompound(node): CompoundMatch | null {
      const ownsKey = (candidate: string) => boundKey === undefined || candidate === boundKey;

      const children = getCompoundChildren(node, '$and');

      if (!children) {
        const identity = parseCustomIdentity(node[KEY_ATTRIBUTE]);

        if (identity) {
          if (!ownsKey(identity.key)) {
            return null;
          }

          return {
            kind: 'predicate',
            predicate: {
              field: `${CUSTOM_FIELD_KEY_PREFIX}${identity.key}`,
              operator: 'is-set',
              values: [identity.subfield, ''],
            },
          };
        }

        const negated = parseCustomIdentity(readNegatedString(node[KEY_ATTRIBUTE]));

        if (negated) {
          if (!ownsKey(negated.key)) {
            return null;
          }

          return {
            kind: 'predicate',
            predicate: {
              field: `${CUSTOM_FIELD_KEY_PREFIX}${negated.key}`,
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

      let identity: { key: string; subfield: string } | undefined;
      let valueRaw: unknown;
      let hasValue = false;

      for (const child of children) {
        const parsed = parseCustomIdentity(child[KEY_ATTRIBUTE]);
        if (parsed) {
          identity = parsed;
        }
        if (VALUE_ATTRIBUTE in child) {
          valueRaw = child[VALUE_ATTRIBUTE];
          hasValue = true;
        }
      }

      if (!identity || !hasValue || !ownsKey(identity.key)) {
        return null;
      }

      const comparator = toComparator(valueRaw);

      if (!comparator) {
        return null;
      }

      return {
        kind: 'value',
        field: `${CUSTOM_FIELD_KEY_PREFIX}${identity.key}`,
        leadingValues: [identity.subfield],
        comparator,
      };
    },
  };
}
