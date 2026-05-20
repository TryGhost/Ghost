import {Temporal} from 'temporal-polyfill';

export function escapeNqlString(value: string): string {
    return `'${value.replace(/\\/g, '\\\\').replace(/'/g, '\\\'')}'`;
}

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const LEGACY_UTC_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/;

export function formatDateInTimezone(value: string, timezone: string): string | null {
    try {
        if (DATE_ONLY_PATTERN.test(value)) {
            return Temporal.PlainDate.from(value).toString();
        }

        const instantValue = LEGACY_UTC_DATE_TIME_PATTERN.test(value)
            ? `${value.replace(' ', 'T')}Z`
            : value;

        return Temporal.Instant.from(instantValue).toZonedDateTimeISO(timezone).toPlainDate().toString();
    } catch {
        return null;
    }
}

export function getTodayInTimezone(timezone: string): string {
    return Temporal.Now.zonedDateTimeISO(timezone).toPlainDate().toString();
}

export function getDayBoundsInUtc(date: string, timezone: string): {start: string; end: string} {
    let plainDate: Temporal.PlainDate;

    try {
        plainDate = Temporal.PlainDate.from(date);
    } catch {
        throw new Error(`Invalid filter date: ${date}`);
    }

    try {
        const start = plainDate.toPlainDateTime(Temporal.PlainTime.from('00:00:00')).toZonedDateTime(timezone).toInstant();
        const end = plainDate.toPlainDateTime(Temporal.PlainTime.from('23:59:59.999')).toZonedDateTime(timezone).toInstant();

        return {
            start: start.toString({fractionalSecondDigits: 3}),
            end: end.toString({fractionalSecondDigits: 3})
        };
    } catch {
        throw new Error(`Invalid timezone: ${timezone}`);
    }
}
