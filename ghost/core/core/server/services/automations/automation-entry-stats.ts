import errors from '@tryghost/errors';
import moment from 'moment-timezone';
import { z } from 'zod';

export type EntryStatsWindow = {
  date_from: string;
  date_to: string;
  bucket: 'day';
  timezone: string;
};

export type EntryStatsData = {
  total_run_count: number;
  entries: { date: string; count: number }[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

const messages = {
  invalidTimezone: 'Invalid automation statistics timezone.',
};

const timezoneSchema = z
  .string()
  .refine((value) => !!moment.tz.zone(value))
  .transform((value) => moment.tz.zone(value)!.name)
  .default('UTC');

export function parseEntryStatsTimezone(timezone: unknown): string {
  const parsed = timezoneSchema.safeParse(timezone);
  if (!parsed.success) {
    throw new errors.ValidationError({ message: messages.invalidTimezone });
  }
  return parsed.data;
}

// Tinybird returns the complete, ordered calendar, including today's zero for empty histories.
export function getEntryStatsWindow(
  entries: EntryStatsData['entries'],
  timezone = 'UTC',
): EntryStatsWindow {
  return {
    date_from: entries[0].date,
    date_to: new Date(Date.parse(entries[entries.length - 1].date) + DAY_MS)
      .toISOString()
      .slice(0, 10),
    bucket: 'day',
    timezone,
  };
}
