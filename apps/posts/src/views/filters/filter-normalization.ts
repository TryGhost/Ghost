import moment from 'moment-timezone';

const OPERATOR_ALIASES: Record<string, string> = {
    is_not: 'is-not',
    not_contains: 'does-not-contain',
    is_none_of: 'is-not-any'
};

export function escapeNqlString(value: string): string {
    return `'${value.replace(/\\/g, '\\\\').replace(/'/g, '\\\'')}'`;
}

export function canonicalizeClauses(clauses: string[]): string[] {
    return [...clauses].sort((left, right) => left.localeCompare(right));
}

export function normalizeMultiValue(values: unknown[]): string[] {
    return values.map(value => String(value)).sort((left, right) => left.localeCompare(right));
}

export function normalizeOperator(operator: string): string {
    return OPERATOR_ALIASES[operator] ?? operator;
}

export function getDayBoundsInUtc(date: string, timezone: string): {start: string; end: string} {
    const start = moment.tz(date, 'YYYY-MM-DD', timezone).startOf('day').utc().toISOString();
    const end = moment.tz(date, 'YYYY-MM-DD', timezone).endOf('day').utc().toISOString();

    return {start, end};
}
