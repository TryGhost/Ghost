/**
 * Timezone-aware date helpers for the publish flow, replacing the
 * moment-timezone usage in Ember (gh-format-post-time and the publish
 * options date picker). Implemented with Intl so apps/admin does not need a
 * timezone library.
 */

interface ZonedParts {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
}

function getZonedParts(date: Date, timeZone: string): ZonedParts {
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });

    const parts: Record<string, string> = {};
    for (const part of formatter.formatToParts(date)) {
        parts[part.type] = part.value;
    }

    return {
        year: Number(parts.year),
        month: Number(parts.month),
        day: Number(parts.day),
        // Intl can return '24' for midnight with hour12: false
        hour: Number(parts.hour) % 24,
        minute: Number(parts.minute),
    };
}

/** Offset of `timeZone` from UTC at `date`, in milliseconds. */
export function timezoneOffsetMs(date: Date, timeZone: string): number {
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });

    const parts: Record<string, string> = {};
    for (const part of formatter.formatToParts(date)) {
        parts[part.type] = part.value;
    }

    const asUtc = Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        Number(parts.hour) % 24,
        Number(parts.minute),
        Number(parts.second),
    );

    // truncate to whole seconds: formatToParts has no millisecond component
    return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * Interpret a wall-clock date ('YYYY-MM-DD') and time ('HH:mm') in
 * `timeZone` and return the corresponding UTC instant.
 */
export function zonedDateTimeToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
    const [year, month, day] = dateStr.split("-").map(Number);
    const [hour, minute] = timeStr.split(":").map(Number);

    const wallClockAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);

    // Two-pass offset resolution handles DST boundaries well enough for a
    // scheduling picker
    let utc = wallClockAsUtc - timezoneOffsetMs(new Date(wallClockAsUtc), timeZone);
    utc = wallClockAsUtc - timezoneOffsetMs(new Date(utc), timeZone);

    return new Date(utc);
}

function pad(value: number): string {
    return String(value).padStart(2, "0");
}

/** 'YYYY-MM-DD' in the given timezone. */
export function formatDateInTimezone(date: Date, timeZone: string): string {
    const parts = getZonedParts(date, timeZone);
    return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

/** 'HH:mm' in the given timezone. */
export function formatTimeInTimezone(date: Date, timeZone: string): string {
    const parts = getZonedParts(date, timeZone);
    return `${pad(parts.hour)}:${pad(parts.minute)}`;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** 'DD MMM YYYY' in the given timezone (e.g. '01 Jan 2050'). */
export function formatDayInTimezone(date: Date, timeZone: string): string {
    const parts = getZonedParts(date, timeZone);
    return `${pad(parts.day)} ${MONTH_NAMES[parts.month - 1]} ${parts.year}`;
}

const FULL_MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

function ordinal(day: number): string {
    const tens = day % 100;
    if (tens >= 11 && tens <= 13) {
        return `${day}th`;
    }
    switch (day % 10) {
        case 1: return `${day}st`;
        case 2: return `${day}nd`;
        case 3: return `${day}rd`;
        default: return `${day}th`;
    }
}

/** 'MMMM Do' in the given timezone (e.g. 'January 1st'), for button copy. */
export function formatMonthDayInTimezone(date: Date, timeZone: string): string {
    const parts = getZonedParts(date, timeZone);
    return `${FULL_MONTH_NAMES[parts.month - 1]} ${ordinal(parts.day)}`;
}

/** '(UTC)' / '(UTC+5:30)' label, matching Ember's gh-format-post-time. */
export function utcOffsetLabel(date: Date, timeZone: string): string {
    const offsetMinutes = Math.round(timezoneOffsetMs(date, timeZone) / 60000);
    if (offsetMinutes === 0) {
        return "(UTC)";
    }

    const sign = offsetMinutes < 0 ? "-" : "+";
    const absolute = Math.abs(offsetMinutes);
    const hours = Math.floor(absolute / 60);
    const minutes = absolute % 60;

    return minutes === 0
        ? `(UTC${sign}${hours})`
        : `(UTC${sign}${hours}:${pad(minutes)})`;
}

/** moment.from-style relative phrasing ('in 10 minutes', 'in 24 years', …). */
export function formatRelative(date: Date, now: Date = new Date()): string {
    const diffMs = date.getTime() - now.getTime();
    const future = diffMs >= 0;
    const seconds = Math.abs(diffMs) / 1000;

    let phrase: string;
    if (seconds < 45) {
        phrase = "a few seconds";
    } else if (seconds < 90) {
        phrase = "a minute";
    } else if (seconds < 45 * 60) {
        phrase = `${Math.round(seconds / 60)} minutes`;
    } else if (seconds < 90 * 60) {
        phrase = "an hour";
    } else if (seconds < 22 * 3600) {
        phrase = `${Math.round(seconds / 3600)} hours`;
    } else if (seconds < 36 * 3600) {
        phrase = "a day";
    } else if (seconds < 26 * 86400) {
        phrase = `${Math.round(seconds / 86400)} days`;
    } else if (seconds < 46 * 86400) {
        phrase = "a month";
    } else if (seconds < 320 * 86400) {
        phrase = `${Math.round(seconds / (30 * 86400))} months`;
    } else if (seconds < 548 * 86400) {
        phrase = "a year";
    } else {
        phrase = `${Math.round(seconds / (365.25 * 86400))} years`;
    }

    return future ? `in ${phrase}` : `${phrase} ago`;
}

function isSameZonedDay(a: Date, b: Date, timeZone: string): boolean {
    return formatDateInTimezone(a, timeZone) === formatDateInTimezone(b, timeZone);
}

/**
 * Schedule phrasing from Ember's formatPostTime with `scheduled: true`:
 * relative within 12 hours, 'at HH:mm (UTC) Today/tomorrow' nearby, else
 * 'at HH:mm (UTC) on DD MMM YYYY'.
 */
export function formatScheduledTime(date: Date, timeZone: string, now: Date = new Date()): string {
    const diffHours = Math.abs(date.getTime() - now.getTime()) / 3600000;
    if (diffHours <= 12) {
        return formatRelative(date, now);
    }

    const time = formatTimeInTimezone(date, timeZone);
    const offset = utcOffsetLabel(date, timeZone);

    if (isSameZonedDay(date, now, timeZone)) {
        return `at ${time} ${offset} Today`;
    }

    const tomorrow = new Date(now.getTime() + 24 * 3600000);
    if (isSameZonedDay(date, tomorrow, timeZone)) {
        return `at ${time} ${offset} tomorrow`;
    }

    return `at ${time} ${offset} on ${formatDayInTimezone(date, timeZone)}`;
}
