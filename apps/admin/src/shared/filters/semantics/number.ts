import { bidirectional } from './operator-table';
import type { OperatorTable } from './operator-table';
import type { ValueSemantics } from './types';

export type NumberOperator = 'is' | 'is-greater' | 'is-or-greater' | 'is-less' | 'is-or-less';

const NUMBER_TABLE: OperatorTable<NumberOperator> = {
  is: { symbol: '', comparator: '$eq' },
  'is-greater': { symbol: '>', comparator: '$gt' },
  'is-or-greater': { symbol: '>=', comparator: '$gte' },
  'is-less': { symbol: '<', comparator: '$lt' },
  'is-or-less': { symbol: '<=', comparator: '$lte' },
};

const number = bidirectional(NUMBER_TABLE);

export function numberSemantics(): ValueSemantics<NumberOperator> {
  return {
    operators: number.operators,
    serialize({ operator, values }) {
      const rawValue = values[0];
      const value =
        typeof rawValue === 'string' ? (rawValue.trim() === '' ? NaN : Number(rawValue)) : rawValue;
      const symbol = number.symbolFor(operator);

      // Finite, not merely not-NaN: `1e309` parses to Infinity, which would be written
      // into the query as the word "Infinity" and could not be read back as a number.
      if (typeof value !== 'number' || !Number.isFinite(value) || symbol === undefined) {
        return null;
      }

      return `${symbol}${value}`;
    },
    parse({ operator, value }) {
      if (typeof value !== 'number') {
        return null;
      }

      const parsed = number.operatorFor(operator);

      return parsed ? { operator: parsed, values: [value] } : null;
    },
  };
}
