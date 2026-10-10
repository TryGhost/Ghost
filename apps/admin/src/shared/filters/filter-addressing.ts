import { extractComparator, getCompoundChildren } from './filter-ast';
import type { AstNode } from './filter-ast';
import type { CodecContext, FilterCodec, FilterPredicate, ParsedPredicate } from './filter-types';
import { listsOperator } from './filter-operators';
import type { PresenceOperator } from './filter-operators';
import type {
  ClauseGroup,
  EqualityClause,
  SemanticValue,
  SerializedValue,
  ValueComparator,
  ValueSemantics,
} from './semantics';

export interface FieldAddress {
  valueKey: string;
  companions?: string[];
  values: unknown[];
}

export interface MatchedValue {
  comparator: ValueComparator;
  field?: string;
  leadingValues?: unknown[];
}

export type CompoundMatch =
  | { kind: 'predicate'; predicate: ParsedPredicate }
  | ({ kind: 'value' } & MatchedValue);

interface FieldAddressingBase {
  address: (predicate: FilterPredicate, ctx: CodecContext) => FieldAddress | null;
  match: (node: AstNode, ctx: CodecContext) => MatchedValue | null;
  matchCompound?: (node: AstNode) => CompoundMatch | null;
}

export type PlainAddressing = FieldAddressingBase & {
  presenceOperators?: undefined;
  addressPresence?: undefined;
};

export type PresenceAddressing = FieldAddressingBase & {
  presenceOperators: readonly PresenceOperator[];
  addressPresence: (predicate: FilterPredicate, ctx: CodecContext) => string[] | null;
};

export type FieldAddressing = PlainAddressing | PresenceAddressing;

// The brackets are not decoration. A clause naming which custom field we mean has to reach the
// backend inside the same bracket as the value it qualifies, and an OR has to keep its comma
// inside brackets or the surrounding pluses steal it: `a+b,c` reads as `(a+b),c`, which is a
// wider set of members than anyone asked for.
function combine(clauses: string[], join: 'and' | 'or' = 'and', group = false): string {
  if (clauses.length === 1 && !group) {
    return clauses[0];
  }

  return `(${clauses.join(join === 'and' ? '+' : ',')})`;
}

function writtenClauses(
  written: SerializedValue,
  valueKey: string,
): { clauses: string[]; join: 'and' | 'or' } {
  if (typeof written === 'string') {
    return { clauses: [`${valueKey}:${written}`], join: 'and' };
  }

  return {
    clauses: written.fragments.map(
      (fragment) => `${fragment.key ?? valueKey}:${fragment.expression}`,
    ),
    join: written.join ?? 'and',
  };
}

export function columnAddressing(config?: { field?: string }): PlainAddressing {
  const keyFor = (ctx: CodecContext) => config?.field ?? ctx.key;

  return {
    address(predicate, ctx) {
      return { valueKey: keyFor(ctx), values: predicate.values };
    },
    match(node, ctx) {
      const comparator = extractComparator(node);

      if (!comparator || comparator.field !== keyFor(ctx)) {
        return null;
      }

      return { comparator: { operator: comparator.operator, value: comparator.value } };
    },
  };
}

function toEqualityClause(node: AstNode): EqualityClause | null {
  const comparator = extractComparator(node);

  if (!comparator || comparator.operator !== '$eq') {
    return null;
  }

  return { key: comparator.field, value: comparator.value };
}

function toClauseGroup(node: AstNode): ClauseGroup | null {
  for (const join of ['and', 'or'] as const) {
    const children = getCompoundChildren(node, join === 'and' ? '$and' : '$or');

    if (children) {
      const clauses = children
        .map((child) => toEqualityClause(child))
        .filter((clause) => clause !== null);

      return clauses.length === children.length ? { join, clauses } : null;
    }
  }

  const clause = toEqualityClause(node);

  return clause ? { join: 'and', clauses: [clause] } : null;
}

function toPredicate(
  matched: MatchedValue,
  parsed: SemanticValue,
  ctx: CodecContext,
): ParsedPredicate {
  return {
    field: matched.field ?? ctx.key,
    operator: parsed.operator,
    values: [...(matched.leadingValues ?? []), ...parsed.values],
  };
}

export function composeCodec<TOperator extends string>(
  addressing: FieldAddressing,
  semantics: ValueSemantics<TOperator>,
): FilterCodec {
  return {
    parse(node, ctx) {
      const matched = addressing.match(node, ctx);

      if (!matched) {
        return null;
      }

      const parsed = semantics.parse(matched.comparator, ctx);

      if (!parsed) {
        return null;
      }

      return toPredicate(matched, parsed, ctx);
    },
    serialize(predicate, ctx) {
      if (
        addressing.presenceOperators &&
        listsOperator(addressing.presenceOperators, predicate.operator)
      ) {
        return addressing.addressPresence(predicate, ctx);
      }

      const address = addressing.address(predicate, ctx);

      if (!address) {
        return null;
      }

      const operator = semantics.operators.find((candidate) => candidate === predicate.operator);

      if (operator === undefined) {
        return null;
      }

      const written = semantics.serialize({ operator, values: address.values }, ctx);

      if (written === null) {
        return null;
      }

      const { clauses, join } = writtenClauses(written, address.valueKey);
      const grouped = typeof written !== 'string';

      return [combine([...(address.companions ?? []), ...clauses], join, grouped)];
    },
    parseCompound: semantics.parseClauses
      ? (node, ctx) => {
          const group = toClauseGroup(node);

          if (!group) {
            return null;
          }

          const parsed = semantics.parseClauses?.(group, ctx);

          if (!parsed) {
            return null;
          }

          return { field: ctx.key, operator: parsed.operator, values: parsed.values };
        }
      : addressing.matchCompound
        ? (node, ctx) => {
            const matched = addressing.matchCompound?.(node);

            if (!matched) {
              return null;
            }

            if (matched.kind === 'predicate') {
              return matched.predicate;
            }

            const parsed = semantics.parse(matched.comparator, ctx);

            if (!parsed) {
              return null;
            }

            return toPredicate(matched, parsed, ctx);
          }
        : undefined,
  };
}
