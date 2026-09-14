import { DateTime } from 'luxon';

import type { Interval } from './types.ts';

const messages = {
  invalidInterval: 'Invalid interval specified. Only "month" value is accepted.',
  unreadableStartDate: 'Invalid start date specified. A date in ISO 8601 format is required.',
};

/** Whether a date can be read at all. A period cannot be counted from one that cannot. */
export const isReadableDate = (value: string): boolean =>
  DateTime.fromISO(value, { zone: 'UTC' }).isValid;

export const SUPPORTED_INTERVALS: readonly Interval[] = ['month'];

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
    const now = DateTime.now().setZone('UTC');
    // Never negative. A subscription that starts later today, or a host clock a little
    // ahead of ours, would otherwise anchor the period before the subscription existed and
    // charge usage from before it against the current allowance. Nothing has elapsed yet,
    // so the current period is the one beginning at the start date.
    const fullPeriodsPast = Math.max(0, Math.floor(now.diff(startDateISO, 'months').months));

    const lastPeriodStartDate = startDateISO.plus({ months: fullPeriodsPast }).toISO();

    if (lastPeriodStartDate === null) {
      // A start date that cannot be read arrives here as a date that cannot be written.
      // Answering with nothing would read downstream as "this limit has no period", which
      // silently turns a per-period allowance into a count of the whole history.
      // eslint-disable-next-line ghost/ghost-custom/no-native-error
      throw new Error(messages.unreadableStartDate);
    }

    return lastPeriodStartDate;
  }

  // new Error is allowed here, as this package runs in browsers and should not depend on
  // @tryghost/errors. Every periodic limit checks its interval before calling this, so only
  // a caller using the function directly arrives here, and that is a programming error.
  // eslint-disable-next-line ghost/ghost-custom/no-native-error
  throw new Error(messages.invalidInterval);
};
