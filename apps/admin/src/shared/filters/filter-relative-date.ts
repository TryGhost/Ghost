import type {FilterField} from './filter-types';

/**
 * The relative-date operator family — "in the last N days" / "in the next N
 * days" — plus the bits any view needs to use them: labels, a type guard, and
 * variant builders that attach them to a date field. Domains decide when to
 * attach them; this file just provides the pieces. The day-count input
 * renderer lives in `create-relative-date-renderer.ts` and its component in
 * `relative-date-filter.tsx`.
 */

export const RELATIVE_PAST_OPERATOR = 'in-the-last';
export const RELATIVE_FUTURE_OPERATOR = 'in-the-next';

export const RELATIVE_DATE_OPERATOR_LABELS: Record<string, string> = {
    [RELATIVE_PAST_OPERATOR]: 'in the last',
    [RELATIVE_FUTURE_OPERATOR]: 'in the next'
};

export function isRelativeDateOperator(operator: string): boolean {
    return operator === RELATIVE_PAST_OPERATOR || operator === RELATIVE_FUTURE_OPERATOR;
}

export function fieldHasRelativeOperator(field: FilterField): boolean {
    return field.operators.some(isRelativeDateOperator);
}

/** Returns the field with the past-leaning relative operator appended. */
export function withPastRelativeOperator<T extends FilterField>(field: T): T {
    return {...field, operators: [...field.operators, RELATIVE_PAST_OPERATOR]};
}

/** Returns the field with the future-leaning relative operator appended. */
export function withFutureRelativeOperator<T extends FilterField>(field: T): T {
    return {...field, operators: [...field.operators, RELATIVE_FUTURE_OPERATOR]};
}

// `yyyymmdd` is a calendar date in the site's timezone. We construct a Date in the
// browser's local zone purely to do calendar arithmetic — only the y/m/d fields are
// read back via Intl, so the local-timezone Date is fine for display.
export function formatRelativeDateTooltip(yyyymmdd: string, dayOffset: number): string {
    const [year, month, day] = yyyymmdd.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + dayOffset);

    return new Intl.DateTimeFormat(getPreferredLocale(), {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }).format(date);
}

function getPreferredLocale(): string {
    if (typeof navigator === 'undefined') {
        return 'en-US';
    }

    return navigator.language || 'en-US';
}
