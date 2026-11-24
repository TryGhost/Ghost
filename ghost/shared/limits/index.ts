import errors from '@tryghost/errors';
import type { LimitService, Subscription } from '@tryghost/limit-service';
import type { Foundation } from '#kernel/foundation';

/**
 * Loads the host's limits into the limit service. It is handed the foundation:
 * it imports no config, no logger and no database.
 */
export function loadLimits(
  limitService: LimitService,
  { config, logging, database }: Foundation,
): void {
  let helpLink;

  if (
    config.get('hostSettings:billing:enabled') === true &&
    config.get('hostSettings:billing:url')
  ) {
    helpLink = config.get('hostSettings:billing:url');
  } else {
    helpLink = 'https://ghost.org/help/';
  }

  let subscription: Subscription | undefined;

  if (config.get('hostSettings:subscription')) {
    subscription = {
      startDate: config.get('hostSettings:subscription:start'),
      interval: 'month',
    };
  }

  const hostLimits = config.get('hostSettings:limits') || {};

  try {
    limitService.loadLimits({
      limits: hostLimits,
      subscription,
      db: database,
      helpLink,
      errors,
    });
  } catch (error) {
    // Do not block the boot process for an incorrect usage error
    if (error instanceof errors.IncorrectUsageError) {
      logging.warn(error);
    } else {
      throw error;
    }
  }
}
