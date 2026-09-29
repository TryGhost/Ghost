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

// Include the complete recorded history through today. Empty histories show today's zero.
export function getEntryStatsWindow(
  entries: EntryStatsData['entries'],
  now = new Date(),
  timezone = 'UTC',
): EntryStatsWindow {
  const today = moment(now).tz(timezone).format('YYYY-MM-DD');
  let start = entries[0]?.date ?? today;
  let end = today;
  for (const { date } of entries) {
    if (date < start) {
      start = date;
    }
    if (date > end) {
      end = date;
    }
  }
  return {
    date_from: start,
    date_to: new Date(Date.parse(end) + DAY_MS).toISOString().slice(0, 10),
    bucket: 'day',
    timezone,
  };
}

export function fillEntryStats(data: EntryStatsData, window: EntryStatsWindow): EntryStatsData {
  const counts = new Map(data.entries.map((entry) => [entry.date, entry.count]));
  const entries = [];
  for (let day = Date.parse(window.date_from); day < Date.parse(window.date_to); day += DAY_MS) {
    const date = new Date(day).toISOString().slice(0, 10);
    entries.push({ date, count: counts.get(date) ?? 0 });
  }
  return { total_run_count: data.total_run_count, entries };
}
