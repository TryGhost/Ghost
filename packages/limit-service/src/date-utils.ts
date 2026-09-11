import errors from '@tryghost/errors';
import { DateTime } from 'luxon';

import type { Interval } from './types.ts';

const messages = {
  invalidInterval: 'Invalid interval specified. Only "month" value is accepted.',
};

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
    const fullPeriodsPast = Math.floor(now.diff(startDateISO, 'months').months);

    const lastPeriodStartDate = startDateISO.plus({ months: fullPeriodsPast });

    return lastPeriodStartDate.toISO() as string;
  }

  throw new errors.IncorrectUsageError({
    message: messages.invalidInterval,
  });
};
