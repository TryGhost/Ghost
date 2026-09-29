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
  incompleteDateRange: 'Supply both date_from and date_to, or neither.',
  reversedDateRange: 'date_from must be on or before date_to.',
  dateRangeEndOverflow: 'date_to must allow a following calendar day.',
  invalidEntryDateRange: 'Invalid automation entry date range.',
};

const timezoneSchema = z
  .string()
  .refine((value) => !!moment.tz.zone(value))
  .transform((value) => moment.tz.zone(value)!.name)
  .default('UTC');

export type EntryStatsOptions = {
  timezone: string;
  window?: EntryStatsWindow;
};

const entryStatsOptionsSchema = z
  .object({
    date_from: z.iso.date().optional(),
    date_to: z.iso.date().optional(),
    timezone: timezoneSchema,
  })
  .superRefine((options, context) => {
    if (!!options.date_from !== !!options.date_to) {
      context.addIssue({
        code: 'custom',
        message: messages.incompleteDateRange,
      });
    } else if (options.date_from && options.date_to && options.date_from > options.date_to) {
      context.addIssue({ code: 'custom', message: messages.reversedDateRange });
    }
    if (options.date_to === '9999-12-31') {
      context.addIssue({ code: 'custom', message: messages.dateRangeEndOverflow });
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
      message: messages.invalidEntryDateRange,
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

// Tinybird returns the complete, ordered calendar, including today's zero for empty histories.
export function getEntryStatsWindow(
  entries: EntryStatsData['entries'],
  timezone = 'UTC',
): EntryStatsWindow {
  return {
    date_from: entries[0].date,
    date_to: nextDate(entries[entries.length - 1].date),
    bucket: 'day',
    timezone,
  };
}
