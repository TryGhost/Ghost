import { Temporal } from 'temporal-polyfill';

/**
 * The time, as the application is handed it. The foundry builds the one clock
 * a process has; nothing in the kernel reads the time.
 *
 * @see [Clock](../README.md#clock)
 */
export interface Clock {
  /** The current time in epoch milliseconds. */
  now(): number;
}

/** Returns the whole seconds of a time in epoch milliseconds, as a Unix time. */
export function toUnixTime(epochMilliseconds: number): number {
  return Math.floor(epochMilliseconds / 1000);
}

// Calendar dates below are ISO "YYYY-MM-DD" strings.

/** Returns the canonical IANA name of a timezone, or null when it is unknown. */
export function resolveTimeZone(timeZone: string): string | null {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone }).resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

/**
 * Returns the epoch milliseconds of a calendar date's first instant in a timezone.
 * Where daylight saving skips midnight that is the transition; where it repeats
 * midnight, the first one.
 */
export function startOfLocalDay(date: string, timeZone: string): number {
  return Temporal.PlainDate.from(date).toZonedDateTime({ timeZone }).epochMilliseconds;
}

/** Returns the calendar date of an instant in a timezone. */
export function localDateOf(epochMilliseconds: number, timeZone: string): string {
  return Temporal.Instant.fromEpochMilliseconds(epochMilliseconds)
    .toZonedDateTimeISO(timeZone)
    .toPlainDate()
    .toString();
}

/** Adds whole days to a calendar date. */
export function addDays(date: string, days: number): string {
  return Temporal.PlainDate.from(date).add({ days }).toString();
}

/** Returns the number of days from one calendar date to another, negative when it is earlier. */
export function daysBetween(from: string, to: string): number {
  return Temporal.PlainDate.from(from).until(Temporal.PlainDate.from(to)).days;
}
