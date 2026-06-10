/**
 * Timezone-aware date helpers for the publish date fields, mirroring the
 * Ember PSM behavior where dates are displayed and entered in the site's
 * timezone (moment-timezone in Ember; Intl here to avoid a date library).
 */

export const DATE_FORMAT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
// Ember validators/post.js publishedAtBlogTime
export const TIME_FORMAT_PATTERN = /^(([0-1]?[0-9])|([2][0-3])):([0-5][0-9])$/;

function wallClockParts(utcMs: number, timeZone: string) {
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
    const parts: Record<string, number> = {};
    for (const part of formatter.formatToParts(new Date(utcMs))) {
        if (part.type !== "literal") {
            parts[part.type] = Number(part.value);
        }
    }
    // "24" is returned for midnight by some ICU versions with hour12: false
    parts.hour = parts.hour % 24;
    return parts as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

function pad(value: number): string {
    return String(value).padStart(2, "0");
}

/** Format a UTC ISO string as `YYYY-MM-DD` in the given timezone. */
export function formatDateInTimezone(isoString: string | Date, timeZone: string): string {
    const utcMs = typeof isoString === "string" ? Date.parse(isoString) : isoString.getTime();
    const { year, month, day } = wallClockParts(utcMs, timeZone);
    return `${year}-${pad(month)}-${pad(day)}`;
}

/** Format a UTC ISO string as `HH:mm` in the given timezone. */
export function formatTimeInTimezone(isoString: string | Date, timeZone: string): string {
    const utcMs = typeof isoString === "string" ? Date.parse(isoString) : isoString.getTime();
    const { hour, minute } = wallClockParts(utcMs, timeZone);
    return `${pad(hour)}:${pad(minute)}`;
}

function timezoneOffsetMs(utcMs: number, timeZone: string): number {
    const { year, month, day, hour, minute, second } = wallClockParts(utcMs, timeZone);
    const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
    return asUtc - utcMs;
}

/**
 * Convert a wall-clock `YYYY-MM-DD` + `HH:mm` in the given timezone to a UTC
 * ISO string. Returns null when the date is not a real calendar date.
 *
 * The offset is computed twice so DST transitions near the target instant
 * resolve to the correct offset (the classic Intl round-trip technique).
 */
export function zonedDateTimeToUtc(date: string, time: string, timeZone: string): string | null {
    if (!DATE_FORMAT_PATTERN.test(date) || !TIME_FORMAT_PATTERN.test(time)) {
        return null;
    }

    const [year, month, day] = date.split("-").map(Number);
    const [hour, minute] = time.split(":").map(Number);

    // reject impossible calendar dates (e.g. 2026-02-31)
    const probe = new Date(Date.UTC(year, month - 1, day));
    if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
        return null;
    }

    const wallMs = Date.UTC(year, month - 1, day, hour, minute);
    let utcMs = wallMs - timezoneOffsetMs(wallMs, timeZone);
    utcMs = wallMs - timezoneOffsetMs(utcMs, timeZone);

    return new Date(utcMs).toISOString();
}
