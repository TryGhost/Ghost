import {normalizeMultiValue, serializeScalarValue} from './value';
import type {NqlSymbol} from '@/shared/filters/nql-tokens';
import type {OperatorId} from '@/shared/filters/filter-operators';
import type {ValueConfig, ValueSemantics} from './types';

const SET_OPERATOR_SYMBOLS = {
    'is-any': '',
    'is-not-any': '-'
} as const satisfies Partial<Record<OperatorId, NqlSymbol>>;

const SET_SYMBOLS: Partial<Record<string, string>> = SET_OPERATOR_SYMBOLS;

export type SetOperator = keyof typeof SET_OPERATOR_SYMBOLS;
export const SET_VALUE_OPERATORS = ['is-any', 'is-not-any'] as const satisfies readonly SetOperator[];

export function setSemantics(config?: ValueConfig): ValueSemantics<SetOperator> {
    return {
        operators: SET_VALUE_OPERATORS,
        serialize({operator, values}) {
            if (!values.length) {
                return null;
            }

            const symbol = SET_SYMBOLS[operator];

            if (symbol === undefined) {
                return null;
            }

            const sorted = normalizeMultiValue(values);

            if (config?.serializeSingletonAsScalar && sorted.length === 1) {
                return `${symbol}${serializeScalarValue(sorted[0], config)}`;
            }

            return `${symbol}[${sorted.map((value: string) => serializeScalarValue(value, config)).join(',')}]`;
        },
        parse({operator, value}) {
            if (operator === '$in' && Array.isArray(value)) {
                return {operator: 'is-any', values: value};
            }

            if (operator === '$nin' && Array.isArray(value)) {
                return {operator: 'is-not-any', values: value};
            }

            if (operator === '$eq') {
                return {operator: 'is-any', values: [value]};
            }

            if (operator === '$ne') {
                return {operator: 'is-not-any', values: [value]};
            }

            return null;
        }
    };
}

