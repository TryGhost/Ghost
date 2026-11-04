import { bidirectional } from './operator-table';
import type { OperatorTable } from './operator-table';
import type { ValueSemantics } from './types';

export type BooleanOperator = 'is';

const BOOLEAN_TABLE: OperatorTable<BooleanOperator> = {
  is: { symbol: '', comparator: '$eq' },
};

const yesNo = bidirectional(BOOLEAN_TABLE);

export const BOOLEAN_OPERATORS = yesNo.operators;

/** A yes or no a filter holds, whether as a boolean or as the text a select holds it as. */
function answerOf(value: unknown): boolean | undefined {
  if (value === true || value === 'true') {
    return true;
  }
  if (value === false || value === 'false') {
    return false;
  }
  return undefined;
}

/**
 * A yes or no, written unquoted so NQL reads it as a boolean rather than as the text `true`, and
 * read back only from one. "Is not yes" would also find members who never answered, so there is
 * only "is": a field's presence filters say whether it was answered at all.
 */
export function booleanSemantics(): ValueSemantics<BooleanOperator> {
  return {
    operators: BOOLEAN_OPERATORS,
    serialize({ operator, values }) {
      const answer = answerOf(values[0]);
      const symbol = yesNo.symbolFor(operator);
      return answer === undefined || symbol === undefined ? null : `${symbol}${String(answer)}`;
    },
    parse({ operator, value }) {
      const parsed = yesNo.operatorFor(operator);
      return parsed && typeof value === 'boolean' ? { operator: parsed, values: [value] } : null;
    },
  };
}
