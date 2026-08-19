import {formatDateInTimezone, getDayBoundsInUtc} from '@/shared/filters/filter-normalization';
import {isAstNode} from '@/shared/filters/filter-ast';
import {bidirectional} from './operator-table';
import type {OperatorTable} from './operator-table';
import type {ValueSemantics} from './types';

export type PlainDateOperator = 'is-less' | 'is-or-less' | 'is-greater' | 'is-or-greater';
export type TimestampOperator = PlainDateOperator | 'in-the-last' | 'in-the-next';

const DATE_TABLE: OperatorTable<PlainDateOperator> = {
    'is-less': {symbol: '<', comparator: '$lt'},
    'is-or-less': {symbol: '<=', comparator: '$lte'},
    'is-greater': {symbol: '>', comparator: '$gt'},
    'is-or-greater': {symbol: '>=', comparator: '$gte'}
};

const date = bidirectional(DATE_TABLE);

export const PLAIN_DATE_OPERATORS = date.operators;
export const TIMESTAMP_OPERATORS = [
    ...PLAIN_DATE_OPERATORS, 'in-the-last', 'in-the-next'
] as const satisfies readonly TimestampOperator[];

/**
 * The two useful trims of the above. A date that can only have happened offers "in the last";
 * one that can only be coming offers "in the next". A date that can be either offers both, which
 * is what a field gets by saying nothing.
 */
export const PAST_TIMESTAMP_OPERATORS = [
    ...PLAIN_DATE_OPERATORS, 'in-the-last'
] as const satisfies readonly TimestampOperator[];

export const FUTURE_TIMESTAMP_OPERATORS = [
    ...PLAIN_DATE_OPERATORS, 'in-the-next'
] as const satisfies readonly TimestampOperator[];

const PLAIN_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function plainDateSemantics(): ValueSemantics<PlainDateOperator> {
    return {
        operators: PLAIN_DATE_OPERATORS,
        serialize({operator, values}) {
            const value = values[0];

            if (typeof value !== 'string' || !PLAIN_DATE_PATTERN.test(value)) {
                return null;
            }

            const symbol = date.symbolFor(operator);

            if (symbol === undefined) {
                return null;
            }

            return `${symbol}'${value}'`;
        },
        parse({operator, value}) {
            if (typeof value !== 'string' || !PLAIN_DATE_PATTERN.test(value)) {
                return null;
            }

            const parsed = date.operatorFor(operator);

            if (!parsed) {
                return null;
            }

            return {operator: parsed, values: [value]};
        }
    };
}

interface RelativeDateTag {
    $relativeDate: {
        op: 'sub' | 'add';
        amount: number;
        unit: string;
    };
}

function isRelativeDateTag(value: unknown): value is RelativeDateTag {
    if (!isAstNode(value)) {
        return false;
    }

    const tag = value.$relativeDate;

    if (!isAstNode(tag)) {
        return false;
    }

    const {op, amount, unit} = tag;

    return (op === 'sub' || op === 'add')
        && typeof amount === 'number' && Number.isSafeInteger(amount) && amount > 0
        && typeof unit === 'string';
}

export function dateSemantics(): ValueSemantics<TimestampOperator> {
    return {
        operators: TIMESTAMP_OPERATORS,
        serialize({operator, values}, ctx) {
            if (operator === 'in-the-last' || operator === 'in-the-next') {
                const days = values[0];

                if (typeof days !== 'number' || !Number.isSafeInteger(days) || days <= 0) {
                    return null;
                }

                const sign = operator === 'in-the-last' ? '-' : '+';
                const symbol = operator === 'in-the-last' ? '>=' : '<=';

                return `${symbol}now${sign}${days}d`;
            }

            const rawValue = values[0];

            if (typeof rawValue !== 'string' || rawValue === '') {
                return null;
            }

            const value = formatDateInTimezone(rawValue, ctx.timezone);

            if (!value) {
                return null;
            }

            const {start, end} = getDayBoundsInUtc(value, ctx.timezone);
            const symbol = date.symbolFor(operator);

            if (symbol === undefined) {
                return null;
            }

            // The pairing looks wrong and is right. The user picks a whole day, but the column
            // holds an exact moment, so each comparison has to land on whichever end of that day
            // keeps the day itself in or out: before the day starts, from the moment it starts,
            // after it ends, until it ends. Pair them up the tidy-looking way instead and every
            // filter is off by a day at one end.
            const boundary = operator === 'is-less' || operator === 'is-or-greater'
                ? start
                : end;

            return `${symbol}'${boundary}'`;
        },
        parse({operator, value}, ctx) {
            if (isRelativeDateTag(value) && value.$relativeDate.unit === 'days') {
                const {op, amount} = value.$relativeDate;
                const isPast = op === 'sub' && operator === '$gte';
                const isFuture = op === 'add' && operator === '$lte';

                if (isPast || isFuture) {
                    return {
                        operator: isPast ? 'in-the-last' : 'in-the-next',
                        values: [amount]
                    };
                }
            }

            if (typeof value !== 'string') {
                return null;
            }

            const parsed = date.operatorFor(operator);
            const formatted = formatDateInTimezone(value, ctx.timezone);

            if (!parsed || !formatted) {
                return null;
            }

            return {operator: parsed, values: [formatted]};
        }
    };
}
