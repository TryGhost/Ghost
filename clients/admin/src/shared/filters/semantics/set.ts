import { normalizeMultiValue, serializeScalarValue } from './value';
import type { NqlSymbol } from '@/shared/filters/nql-tokens';
import type { OperatorId } from '@/shared/filters/filter-operators';
import type { ValueConfig, ValueSemantics } from './types';

// How NQL writes each set operator: the symbol before the list, and the character between the
// list's values. "Is any of" Cat and Dog is `[Cat,Dog]`, "is all of" them is `[Cat+Dog]`, and
// "is none of" them is `-[Cat,Dog]`.
const SET_OPERATOR_NQL = {
  'is-any': { symbol: '', join: ',' },
  'is-all': { symbol: '', join: '+' },
  'is-not-any': { symbol: '-', join: ',' },
} as const satisfies Partial<Record<OperatorId, { symbol: NqlSymbol; join: string }>>;

const SET_NQL: Partial<Record<string, { symbol: string; join: string }>> = SET_OPERATOR_NQL;

export type SetOperator = keyof typeof SET_OPERATOR_NQL;

/**
 * The operators a set filter offers unless its field lists its own. "Is all of" isn't among them:
 * it only makes sense where a member can hold several of the set's values, as with labels, and a
 * field like that lists it itself.
 */
export const SET_VALUE_OPERATORS = [
  'is-any',
  'is-not-any',
] as const satisfies readonly SetOperator[];

const SET_OPERATORS = ['is-any', 'is-all', 'is-not-any'] as const satisfies readonly SetOperator[];

export function setSemantics(config?: ValueConfig): ValueSemantics<SetOperator> {
  return {
    operators: SET_OPERATORS,
    serialize({ operator, values }) {
      if (!values.length) {
        return null;
      }

      const written = SET_NQL[operator];

      if (written === undefined) {
        return null;
      }

      const { symbol, join } = written;

      const sorted = normalizeMultiValue(values);

      if (config?.serializeSingletonAsScalar && sorted.length === 1) {
        return `${symbol}${serializeScalarValue(sorted[0], config)}`;
      }

      return `${symbol}[${sorted.map((value: string) => serializeScalarValue(value, config)).join(join)}]`;
    },
    parse({ operator, value }) {
      if (operator === '$in' && Array.isArray(value)) {
        return { operator: 'is-any', values: value };
      }

      if (operator === '$nin' && Array.isArray(value)) {
        return { operator: 'is-not-any', values: value };
      }

      if (operator === '$all' && Array.isArray(value)) {
        return { operator: 'is-all', values: value };
      }

      if (operator === '$eq') {
        return { operator: 'is-any', values: [value] };
      }

      if (operator === '$ne') {
        return { operator: 'is-not-any', values: [value] };
      }

      return null;
    },
  };
}
