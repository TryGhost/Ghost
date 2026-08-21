import { bidirectional } from './operator-table';
import { serializeScalarValue } from './value';
import type { OperatorTable } from './operator-table';
import type { ValueConfig, ValueSemantics } from './types';

export type ScalarOperator = 'is' | 'is-not';

const SCALAR_TABLE: OperatorTable<ScalarOperator> = {
  is: { symbol: '', comparator: '$eq' },
  'is-not': { symbol: '-', comparator: '$ne' },
};

const scalar = bidirectional(SCALAR_TABLE);

export const SCALAR_VALUE_OPERATORS = scalar.operators;

export function scalarSemantics(config?: ValueConfig): ValueSemantics<ScalarOperator> {
  return {
    operators: scalar.operators,
    serialize({ operator, values }) {
      const value = values[0];
      const symbol = scalar.symbolFor(operator);

      if (value === undefined || value === null || value === '' || symbol === undefined) {
        return null;
      }

      return `${symbol}${serializeScalarValue(value, config)}`;
    },
    parse({ operator, value }) {
      const parsed = scalar.operatorFor(operator);

      return parsed ? { operator: parsed, values: [value] } : null;
    },
  };
}
