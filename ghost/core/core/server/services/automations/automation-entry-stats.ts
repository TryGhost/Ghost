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

export type EntryStatsOptions = {
  timezone: string;
  window?: EntryStatsWindow;
};

const entryStatsOptionsSchema = z
  .object({
    date_from: z.iso.date().optional(),
    date_to: z.iso.date().optional(),
    timezone: z
      .string()
      .refine((value) => !!moment.tz.zone(value))
      .transform((value) => moment.tz.zone(value)!.name)
      .default('UTC'),
  })
  .superRefine((options, context) => {
    if (!!options.date_from !== !!options.date_to) {
      context.addIssue({
        code: 'custom',
        message: 'Supply both date_from and date_to, or neither.',
      });
    } else if (options.date_from && options.date_to && options.date_from > options.date_to) {
      context.addIssue({ code: 'custom', message: 'date_from must be on or before date_to.' });
    }
    if (options.date_to === '9999-12-31') {
      context.addIssue({ code: 'custom', message: 'date_to must allow a following calendar day.' });
    }
  });

function nextDate(date: string) {
  return new Date(Date.parse(date) + DAY_MS).toISOString().slice(0, 10);
}

// Requests use inclusive calendar dates, like other analytics endpoints.
// Response windows and Tinybird predicates use an exclusive upper boundary.
export function parseEntryStatsOptions(options: unknown): EntryStatsOptions {
  const parsed = entryStatsOptionsSchema.safeParse(options);
  if (!parsed.success) {
    throw new errors.ValidationError({
      message: 'Invalid automation entry date range.',
      context: parsed.error.issues.map((issue) => issue.message).join(' '),
    });
  }
  const { date_from: dateFrom, date_to: dateTo, timezone } = parsed.data;
  return {
    timezone,
    ...(dateFrom && dateTo
      ? {
          window: {
            date_from: dateFrom,
            date_to: nextDate(dateTo),
            timezone,
            bucket: 'day' as const,
          },
        }
      : {}),
  };
}

// Include the complete recorded history through today in the requested timezone.
export function getEntryStatsWindow(
  entries: EntryStatsData['entries'],
  now = new Date(),
  timezone = 'UTC',
): EntryStatsWindow {
  const today = moment(now).tz(timezone).format('YYYY-MM-DD');
  const dates = entries.map((entry) => entry.date).sort();
  const start = dates[0] ?? today;
  const latest = dates.at(-1) ?? today;
  const end = latest > today ? latest : today;
  return {
    date_from: start,
    date_to: nextDate(end),
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
