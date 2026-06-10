import { describe, expect, it } from "vitest";
import { formatDateInTimezone, formatTimeInTimezone, zonedDateTimeToUtc } from "./publish-time";

describe("publish-time", () => {
    describe("formatDateInTimezone / formatTimeInTimezone", () => {
        it("formats a UTC instant in UTC", () => {
            expect(formatDateInTimezone("2026-01-05T10:30:00.000Z", "Etc/UTC")).toBe("2026-01-05");
            expect(formatTimeInTimezone("2026-01-05T10:30:00.000Z", "Etc/UTC")).toBe("10:30");
        });

        it("formats a UTC instant in a non-UTC timezone (crossing the date line)", () => {
            // 23:30 UTC on Jan 5 is already Jan 6 in Tokyo (UTC+9)
            expect(formatDateInTimezone("2026-01-05T23:30:00.000Z", "Asia/Tokyo")).toBe("2026-01-06");
            expect(formatTimeInTimezone("2026-01-05T23:30:00.000Z", "Asia/Tokyo")).toBe("08:30");
        });

        it("pads midnight to 00", () => {
            expect(formatTimeInTimezone("2026-01-05T00:05:00.000Z", "Etc/UTC")).toBe("00:05");
        });
    });

    describe("zonedDateTimeToUtc", () => {
        it("converts a UTC wall-clock to a UTC ISO string", () => {
            expect(zonedDateTimeToUtc("2026-01-05", "10:30", "Etc/UTC")).toBe("2026-01-05T10:30:00.000Z");
        });

        it("converts a non-UTC wall-clock using the standard-time offset", () => {
            // New York is UTC-5 in January
            expect(zonedDateTimeToUtc("2026-01-05", "10:30", "America/New_York")).toBe("2026-01-05T15:30:00.000Z");
        });

        it("converts a non-UTC wall-clock using the DST offset", () => {
            // New York is UTC-4 in July
            expect(zonedDateTimeToUtc("2026-07-01", "12:00", "America/New_York")).toBe("2026-07-01T16:00:00.000Z");
        });

        it("round-trips with the formatters", () => {
            const iso = zonedDateTimeToUtc("2026-03-08", "09:15", "Europe/Stockholm");
            expect(iso).not.toBeNull();
            expect(formatDateInTimezone(iso as string, "Europe/Stockholm")).toBe("2026-03-08");
            expect(formatTimeInTimezone(iso as string, "Europe/Stockholm")).toBe("09:15");
        });

        it("rejects malformed inputs", () => {
            expect(zonedDateTimeToUtc("05-01-2026", "10:30", "Etc/UTC")).toBeNull();
            expect(zonedDateTimeToUtc("2026-01-05", "25:00", "Etc/UTC")).toBeNull();
            expect(zonedDateTimeToUtc("not-a-date", "10:30", "Etc/UTC")).toBeNull();
        });

        it("rejects impossible calendar dates", () => {
            expect(zonedDateTimeToUtc("2026-02-31", "10:30", "Etc/UTC")).toBeNull();
        });
    });
});
