import moment from 'moment-timezone';

export function escapeNqlString(value: string): string {
    return `'${value.replace(/\\/g, '\\\\').replace(/'/g, '\\\'')}'`;
}

export function getDayBoundsInUtc(date: string, timezone: string): {start: string; end: string} {
    const start = moment.tz(date, 'YYYY-MM-DD', timezone).startOf('day').utc().toISOString();
    const end = moment.tz(date, 'YYYY-MM-DD', timezone).endOf('day').utc().toISOString();

    return {start, end};
}
