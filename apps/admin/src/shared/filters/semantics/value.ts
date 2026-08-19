import {escapeNqlString} from '@tryghost/nql-string';
import type {ValueConfig} from './types';

const UNQUOTED_TOKEN_PATTERN = /^[A-Za-z0-9_.-]+$/;

export function normalizeMultiValue(values: unknown[]): string[] {
    return values.map(value => String(value)).sort((left, right) => left.localeCompare(right));
}

export function serializeScalarValue(value: unknown, config?: ValueConfig): string {
    if (typeof value === 'string') {
        // The leading-minus check looks redundant because the pattern below allows a minus, and
        // it isn't: in a query a minus at the front of a value means "not this". A value that
        // genuinely starts with one has to be quoted, or `status:'-paid'` turns into `status:-paid`
        // and the filter starts meaning the opposite of what it says.
        if (config?.quoteStrings || value.startsWith('-') || !UNQUOTED_TOKEN_PATTERN.test(value)) {
            return escapeNqlString(value);
        }

        return value;
    }

    return String(value);
}

