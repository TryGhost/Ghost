import errors from '@tryghost/errors';
import moment from 'moment-timezone';
import { z } from 'zod';

export type EntryStatsWindow = {
  date_from: string;
  date_to: string;
  bucket: 'day' | 'hour';
  timezone: string;
};

export type EntryStatsData = {
  total_run_count: number;
  entries: { date: string; count: number }[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

const messages = {
  missingStartDate: 'date_from is required when date_to is provided.',
  reversedDateRange: 'date_from must be on or before date_to.',
  futureStartDate: 'date_from must not be in the future.',
  futureEndDate: 'date_to must not be in the future.',
  invalidEntryDateRange: 'Invalid automation entry date range.',
};

const timezoneSchema = z
  .string()
  .refine((value) => !!moment.tz.zone(value), { abort: true })
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
    if (options.date_to && !options.date_from) {
      context.addIssue({
        code: 'custom',
        message: messages.missingStartDate,
      });
    } else if (options.date_from && options.date_to && options.date_from > options.date_to) {
      context.addIssue({ code: 'custom', message: messages.reversedDateRange });
    }
    const today = moment().tz(options.timezone).format('YYYY-MM-DD');
    if (options.date_from && options.date_from > today) {
      context.addIssue({ code: 'custom', message: messages.futureStartDate });
    }
    if (options.date_to && options.date_to > today) {
      context.addIssue({ code: 'custom', message: messages.futureEndDate });
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
    ...(dateFrom
      ? {
          window: {
            date_from: dateFrom,
            date_to: nextDate(dateTo ?? moment().tz(timezone).format('YYYY-MM-DD')),
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
    date_from: entryDate(entries[0].date, timezone),
    date_to: nextDate(entryDate(entries[entries.length - 1].date, timezone)),
    bucket: entries[0].date.includes('T') ? 'hour' : 'day',
    timezone,
  };
}

export function entryDate(date: string, timezone: string): string {
  return date.includes('T') ? moment(date).tz(timezone).format('YYYY-MM-DD') : date;
}
