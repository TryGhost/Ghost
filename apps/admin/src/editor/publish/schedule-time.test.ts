import { describe, expect, it } from "vitest";
import {
    formatDateInTimezone,
    formatDayInTimezone,
    formatMonthDayInTimezone,
    formatRelative,
    formatScheduledTime,
    formatTimeInTimezone,
    timezoneOffsetMs,
    utcOffsetLabel,
    zonedDateTimeToUtc,
} from "./schedule-time";

const NOW = new Date("2026-06-09T12:00:00.000Z");

describe("schedule-time", () => {
    it("computes timezone offsets", () => {
        expect(timezoneOffsetMs(NOW, "Etc/UTC")).toBe(0);
        // New York is UTC-4 in June (EDT)
        expect(timezoneOffsetMs(NOW, "America/New_York")).toBe(-4 * 3600000);
        // and UTC-5 in January (EST)
        expect(timezoneOffsetMs(new Date("2026-01-09T12:00:00.000Z"), "America/New_York")).toBe(-5 * 3600000);
    });

    it("converts wall-clock date/time in a timezone to UTC", () => {
        expect(zonedDateTimeToUtc("2050-01-01", "10:30", "Etc/UTC").toISOString())
            .toBe("2050-01-01T10:30:00.000Z");
        expect(zonedDateTimeToUtc("2050-01-01", "10:30", "America/New_York").toISOString())
            .toBe("2050-01-01T15:30:00.000Z");
        expect(zonedDateTimeToUtc("2050-07-01", "10:30", "America/New_York").toISOString())
            .toBe("2050-07-01T14:30:00.000Z");
    });

    it("formats dates and times in a timezone", () => {
        const date = new Date("2050-01-01T15:30:00.000Z");

        expect(formatDateInTimezone(date, "Etc/UTC")).toBe("2050-01-01");
        expect(formatTimeInTimezone(date, "Etc/UTC")).toBe("15:30");
        expect(formatDateInTimezone(date, "America/New_York")).toBe("2050-01-01");
        expect(formatTimeInTimezone(date, "America/New_York")).toBe("10:30");
        expect(formatDayInTimezone(date, "Etc/UTC")).toBe("01 Jan 2050");
        expect(formatMonthDayInTimezone(date, "Etc/UTC")).toBe("January 1st");
    });

    it("labels UTC offsets like Ember's gh-format-post-time", () => {
        const date = new Date("2026-06-09T12:00:00.000Z");

        expect(utcOffsetLabel(date, "Etc/UTC")).toBe("(UTC)");
        expect(utcOffsetLabel(date, "America/New_York")).toBe("(UTC-4)");
        expect(utcOffsetLabel(date, "Asia/Kolkata")).toBe("(UTC+5:30)");
    });

    it("formats relative times like moment.from", () => {
        expect(formatRelative(new Date(NOW.getTime() + 10 * 60000), NOW)).toBe("in 10 minutes");
        expect(formatRelative(new Date(NOW.getTime() + 3 * 3600000), NOW)).toBe("in 3 hours");
        expect(formatRelative(new Date("2050-01-01T12:00:00.000Z"), NOW)).toBe("in 24 years");
        expect(formatRelative(new Date(NOW.getTime() - 10 * 60000), NOW)).toBe("10 minutes ago");
    });

    it("formats scheduled times relatively within 12 hours and absolutely beyond", () => {
        expect(formatScheduledTime(new Date(NOW.getTime() + 10 * 60000), "Etc/UTC", NOW))
            .toBe("in 10 minutes");
        expect(formatScheduledTime(new Date("2050-01-01T16:25:00.000Z"), "Etc/UTC", NOW))
            .toBe("at 16:25 (UTC) on 01 Jan 2050");
    });

    it("formats same-day and next-day schedules with Today/tomorrow", () => {
        // > 12h away but same day in a timezone west of UTC
        const now = new Date("2026-06-09T03:00:00.000Z");
        const sameDay = new Date("2026-06-09T23:30:00.000Z");
        expect(formatScheduledTime(sameDay, "Etc/UTC", now)).toBe("at 23:30 (UTC) Today");

        const tomorrow = new Date("2026-06-10T18:00:00.000Z");
        expect(formatScheduledTime(tomorrow, "Etc/UTC", now)).toBe("at 18:00 (UTC) tomorrow");
    });
});
