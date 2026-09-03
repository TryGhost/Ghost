import { DateTime } from 'luxon';
import { IncorrectUsageError } from '@tryghost/errors';

import type { Interval } from './types.js';

const messages = {
  invalidInterval: 'Invalid interval specified. Only "month" value is accepted.',
  invalidStartDate: 'Invalid start date specified. An ISO 8601 date is required.',
};

export const SUPPORTED_INTERVALS: Interval[] = ['month'];

/**
 * Whether a period can actually be counted from this date. Checked when limits are built,
 * so an unreadable one is refused there rather than throwing later, in the middle of
 * whatever request happened to need the count.
 */
export const isCountablePeriodStart = (startDate: string): boolean =>
  DateTime.fromISO(startDate, { zone: 'UTC' }).isValid;

/**
 * Calculates the start of the last period (billing, cycle, etc.) based on the start date
 * and the interval at which the cycle renews.
 *
 * @param startDate - date in ISO 8601 format
 * @param interval - currently only supports 'month', in the future might support 'year', etc.
 * @returns date in ISO 8601 format of the last period start
 */
export const lastPeriodStart = (startDate: string, interval: Interval): string => {
  if (interval === 'month') {
    const startDateISO = DateTime.fromISO(startDate, { zone: 'UTC' });

    // An unreadable start date otherwise yields an invalid date whose ISO form is null,
    // which a caller would go on to count against as though it were a real period start.
    // Saying so is the only useful thing to do with it.
    if (!startDateISO.isValid) {
      throw new IncorrectUsageError({
        message: messages.invalidStartDate,
      });
    }

    const now = DateTime.now().setZone('UTC');
    const fullPeriodsPast = Math.floor(now.diff(startDateISO, 'months').months);

    const lastPeriodStartDate = startDateISO.plus({ months: fullPeriodsPast });

    return lastPeriodStartDate.toISO() as string;
  }

  throw new IncorrectUsageError({
    message: messages.invalidInterval,
  });
};
