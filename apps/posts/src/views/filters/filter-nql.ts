import {escapeNqlString, normalizeMultiValue, normalizeOperator} from './filter-normalization';
import {extractComparator} from './filter-ast';
import type {FilterFieldNql} from './filter-types';

const SCALAR_OPERATORS: Record<string, string> = {
    $eq: 'is',
    $ne: 'is-not'
};

const NUMBER_OPERATORS: Record<string, string> = {
    $eq: 'is',
    $gt: 'is-greater',
    $gte: 'is-or-greater',
    $lt: 'is-less',
    $lte: 'is-or-less'
};

const TEXT_OPERATOR_SYMBOLS: Record<string, string> = {
    contains: '~',
    'does-not-contain': '-~',
    'starts-with': '~^',
    'does-not-start-with': '-~^',
    'ends-with': '~$',
    'does-not-end-with': '-~$'
};

const NUMBER_OPERATOR_SYMBOLS: Record<string, string> = {
    is: '',
    'is-greater': '>',
    'is-or-greater': '>=',
    'is-less': '<',
    'is-or-less': '<='
};

const SET_OPERATOR_SYMBOLS: Record<string, string> = {
    'is-any': '',
    'is-not-any': '-'
};

const UNQUOTED_TOKEN_PATTERN = /^[A-Za-z0-9_.-]+$/;

interface NqlConfig {
    field?: string;
    quoteStrings?: boolean;
    serializeSingletonAsScalar?: boolean;
}

function getNqlField(config: NqlConfig | undefined, key: string): string {
    return config?.field ?? key;
}

function serializeScalarValue(value: unknown, config?: NqlConfig): string {
    if (typeof value === 'string') {
        if (config?.quoteStrings || value.startsWith('-') || !UNQUOTED_TOKEN_PATTERN.test(value)) {
            return escapeNqlString(value);
        }

        return value;
    }

    return String(value);
}

function extractRegexOperator(pattern: RegExp, negated = false): string {
    const source = pattern.source;
    const startsWith = source.startsWith('^');
    const endsWith = source.endsWith('$');

    if (startsWith && endsWith) {
        return negated ? 'does-not-contain' : 'contains';
    }

    if (startsWith) {
        return negated ? 'does-not-start-with' : 'starts-with';
    }

    if (endsWith) {
        return negated ? 'does-not-end-with' : 'ends-with';
    }

    return negated ? 'does-not-contain' : 'contains';
}

function normalizeRegexValue(pattern: RegExp): string {
    let source = pattern.source;

    if (source.startsWith('^')) {
        source = source.slice(1);
    }

    if (source.endsWith('$')) {
        source = source.slice(0, -1);
    }

    return source.replace(/\\([\\.^$|?*+()[\]{}\/-])/g, '$1');
}

export function scalarNql(config?: NqlConfig): FilterFieldNql {
    return {
        fromNql(node, ctx) {
            const comparator = extractComparator(node as Record<string, unknown>);
            const field = getNqlField(config, ctx.key);

            if (!comparator || comparator.field !== field) {
                return null;
            }

            const operator = SCALAR_OPERATORS[comparator.operator];

            if (!operator) {
                return null;
            }

            return {
                field: ctx.key,
                operator,
                values: [comparator.value]
            };
        },
        toNql(filter, ctx) {
            const value = filter.values[0];
            const field = getNqlField(config, ctx.key);
            const operator = normalizeOperator(filter.operator);

            if (value === undefined || value === null || value === '') {
                return null;
            }

            if (operator === 'is') {
                return [`${field}:${serializeScalarValue(value, config)}`];
            }

            if (operator === 'is-not') {
                return [`${field}:-${serializeScalarValue(value, config)}`];
            }

            return null;
        }
    };
}

export function textNql(config?: NqlConfig): FilterFieldNql {
    return {
        fromNql(node, ctx) {
            const comparator = extractComparator(node as Record<string, unknown>);
            const field = getNqlField(config, ctx.key);

            if (!comparator || comparator.field !== field) {
                return null;
            }

            if (comparator.operator === '$eq' && typeof comparator.value === 'string') {
                return {
                    field: ctx.key,
                    operator: 'is',
                    values: [comparator.value]
                };
            }

            if (comparator.operator === '$regex' && comparator.value instanceof RegExp) {
                return {
                    field: ctx.key,
                    operator: extractRegexOperator(comparator.value),
                    values: [normalizeRegexValue(comparator.value)]
                };
            }

            if (comparator.operator === '$not' && comparator.value instanceof RegExp) {
                return {
                    field: ctx.key,
                    operator: extractRegexOperator(comparator.value, true),
                    values: [normalizeRegexValue(comparator.value)]
                };
            }

            return null;
        },
        toNql(filter, ctx) {
            const rawValue = filter.values[0];
            const field = getNqlField(config, ctx.key);
            const operator = normalizeOperator(filter.operator);

            if (typeof rawValue !== 'string') {
                return null;
            }

            if (operator === 'is') {
                return [`${field}:${escapeNqlString(rawValue)}`];
            }

            const symbol = TEXT_OPERATOR_SYMBOLS[operator];

            if (!symbol) {
                return null;
            }

            return [`${field}:${symbol}${escapeNqlString(rawValue)}`];
        }
    };
}

export function setNql(config?: NqlConfig): FilterFieldNql {
    return {
        fromNql(node, ctx) {
            const comparator = extractComparator(node as Record<string, unknown>);
            const field = getNqlField(config, ctx.key);

            if (!comparator || comparator.field !== field) {
                return null;
            }

            if (comparator.operator === '$in' && Array.isArray(comparator.value)) {
                return {
                    field: ctx.key,
                    operator: 'is-any',
                    values: comparator.value
                };
            }

            if (comparator.operator === '$nin' && Array.isArray(comparator.value)) {
                return {
                    field: ctx.key,
                    operator: 'is-not-any',
                    values: comparator.value
                };
            }

            if (comparator.operator === '$eq') {
                return {
                    field: ctx.key,
                    operator: 'is-any',
                    values: [comparator.value]
                };
            }

            if (comparator.operator === '$ne') {
                return {
                    field: ctx.key,
                    operator: 'is-not-any',
                    values: [comparator.value]
                };
            }

            return null;
        },
        toNql(filter, ctx) {
            const field = getNqlField(config, ctx.key);
            const operator = normalizeOperator(filter.operator);

            if (!filter.values.length) {
                return null;
            }

            const symbol = SET_OPERATOR_SYMBOLS[operator];

            if (symbol === undefined) {
                return null;
            }

            const values = normalizeMultiValue(filter.values);

            if (config?.serializeSingletonAsScalar && values.length === 1) {
                return [`${field}:${symbol}${serializeScalarValue(values[0], config)}`];
            }

            return [`${field}:${symbol}[${values.map(value => serializeScalarValue(value, config)).join(',')}]`];
        }
    };
}

export function numberNql(config?: NqlConfig): FilterFieldNql {
    return {
        fromNql(node, ctx) {
            const comparator = extractComparator(node as Record<string, unknown>);
            const field = getNqlField(config, ctx.key);

            if (!comparator || comparator.field !== field || typeof comparator.value !== 'number') {
                return null;
            }

            const operator = NUMBER_OPERATORS[comparator.operator];

            if (!operator) {
                return null;
            }

            return {
                field: ctx.key,
                operator,
                values: [comparator.value]
            };
        },
        toNql(filter, ctx) {
            const rawValue = filter.values[0];
            const field = getNqlField(config, ctx.key);
            const value = typeof rawValue === 'string'
                ? rawValue.trim() === ''
                    ? NaN
                    : Number(rawValue)
                : rawValue;
            const operator = normalizeOperator(filter.operator);

            if (typeof value !== 'number' || Number.isNaN(value)) {
                return null;
            }

            const symbol = NUMBER_OPERATOR_SYMBOLS[operator];

            if (symbol === undefined) {
                return null;
            }

            return [`${field}:${symbol}${value}`];
        }
    };
}
