import {escapeNqlString} from './filter-normalization';
import {extractComparator} from './filter-ast';
import type {FilterCodec} from './filter-types';

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

interface CodecConfig {
    field?: string;
    quoteStrings?: boolean;
    serializeSingletonAsScalar?: boolean;
}

function getCodecField(config: CodecConfig | undefined, key: string): string {
    return config?.field ?? key;
}

function normalizeMultiValue(values: unknown[]): string[] {
    return values.map(value => String(value)).sort((left, right) => left.localeCompare(right));
}

function serializeScalarValue(value: unknown, config?: CodecConfig): string {
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

export function scalarCodec(config?: CodecConfig): FilterCodec {
    return {
        parse(node, ctx) {
            const comparator = extractComparator(node as Record<string, unknown>);
            const field = getCodecField(config, ctx.key);

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
        serialize(predicate, ctx) {
            const value = predicate.values[0];
            const field = getCodecField(config, ctx.key);

            if (value === undefined || value === null || value === '') {
                return null;
            }

            if (predicate.operator === 'is') {
                return [`${field}:${serializeScalarValue(value, config)}`];
            }

            if (predicate.operator === 'is-not') {
                return [`${field}:-${serializeScalarValue(value, config)}`];
            }

            return null;
        }
    };
}

export function textCodec(config?: CodecConfig): FilterCodec {
    return {
        parse(node, ctx) {
            const comparator = extractComparator(node as Record<string, unknown>);
            const field = getCodecField(config, ctx.key);

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
        serialize(predicate, ctx) {
            const rawValue = predicate.values[0];
            const field = getCodecField(config, ctx.key);

            if (typeof rawValue !== 'string' || rawValue === '') {
                return null;
            }

            if (predicate.operator === 'is') {
                return [`${field}:${escapeNqlString(rawValue)}`];
            }

            const operator = TEXT_OPERATOR_SYMBOLS[predicate.operator];

            if (!operator) {
                return null;
            }

            return [`${field}:${operator}${escapeNqlString(rawValue)}`];
        }
    };
}

export function setCodec(config?: CodecConfig): FilterCodec {
    return {
        parse(node, ctx) {
            const comparator = extractComparator(node as Record<string, unknown>);
            const field = getCodecField(config, ctx.key);

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
        serialize(predicate, ctx) {
            const field = getCodecField(config, ctx.key);

            if (!predicate.values.length) {
                return null;
            }

            const operator = SET_OPERATOR_SYMBOLS[predicate.operator];

            if (operator === undefined) {
                return null;
            }

            const values = normalizeMultiValue(predicate.values);

            if (config?.serializeSingletonAsScalar && values.length === 1) {
                return [`${field}:${operator}${serializeScalarValue(values[0], config)}`];
            }

            return [`${field}:${operator}[${values.map(value => serializeScalarValue(value, config)).join(',')}]`];
        }
    };
}

export function numberCodec(config?: CodecConfig): FilterCodec {
    return {
        parse(node, ctx) {
            const comparator = extractComparator(node as Record<string, unknown>);
            const field = getCodecField(config, ctx.key);

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
        serialize(predicate, ctx) {
            const rawValue = predicate.values[0];
            const field = getCodecField(config, ctx.key);
            const value = typeof rawValue === 'string'
                ? rawValue.trim() === ''
                    ? NaN
                    : Number(rawValue)
                : rawValue;

            if (typeof value !== 'number' || Number.isNaN(value)) {
                return null;
            }

            const operator = NUMBER_OPERATOR_SYMBOLS[predicate.operator];

            if (operator === undefined) {
                return null;
            }

            return [`${field}:${operator}${value}`];
        }
    };
}
