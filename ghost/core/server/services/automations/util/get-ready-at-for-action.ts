import errors from '@tryghost/errors';
import type { ReadonlyDeep } from 'type-fest';

const HOUR_MS = 3600000;

export const getReadyAtForAction = (
  action: ReadonlyDeep<{ type: 'wait'; wait_hours: number } | { type: 'send_email' }>,
  now: Readonly<Date>,
  fakeWaitHoursMultiplier: number | null,
): Date => {
  switch (action.type) {
    case 'send_email':
      return now;
    case 'wait': {
      const waitMs = action.wait_hours * (fakeWaitHoursMultiplier || HOUR_MS);
      return new Date(now.getTime() + waitMs);
    }
    /* v8 ignore start -- @preserve */
    default: {
      const _exhaustive: never = action;
      throw new errors.IncorrectUsageError({
        message: `Unexpected action ${String(_exhaustive)}`,
      });
    }
    /* v8 ignore stop -- @preserve */
  }
};
