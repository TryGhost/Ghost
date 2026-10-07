import type { NqlComparator, NqlSymbol } from '@/shared/filters/nql-tokens';

export interface OperatorEncoding {
  symbol: NqlSymbol;
  comparator: NqlComparator;
}

export type OperatorTable<TOperator extends string> = Readonly<Record<TOperator, OperatorEncoding>>;

export interface BidirectionalOperators<TOperator extends string> {
  operators: readonly TOperator[];
  symbolFor: (operator: string) => NqlSymbol | undefined;
  operatorFor: (comparator: string) => TOperator | undefined;
}

export function bidirectional<TOperator extends string>(
  table: OperatorTable<TOperator>,
): BidirectionalOperators<TOperator> {
  const entries = Object.entries(table) as [TOperator, OperatorEncoding][];
  const byComparator = new Map<string, TOperator>();

  for (const [operator, encoding] of entries) {
    if (!byComparator.has(encoding.comparator)) {
      byComparator.set(encoding.comparator, operator);
    }
  }

  return {
    operators: entries.map(([operator]) => operator),
    symbolFor(operator) {
      return entries.find(([candidate]) => candidate === operator)?.[1].symbol;
    },
    operatorFor(comparator) {
      return byComparator.get(comparator);
    },
  };
}
