import errors from '@tryghost/errors';
import { LimitService, type LoadLimitsOptions, type Subscription } from '@tryghost/limit-service';
import type { Foundation } from '#kernel/foundation';
import { defineService } from '../../bootstrap/transition/define-service';

/**
 * Reads the limits a host configures for the site into a limit service. The service counts
 * against the database when a limit is checked, not here.
 *
 * `create` uses it. It is an extra only so that a test which changes the host's limits can ask the
 * service the application holds to read them again; nothing in Ghost reloads limits.
 */
function load(
  limitService: LimitService,
  foundation: Pick<Foundation, 'config' | 'database' | 'logger'>,
): void {
  const { config, logger } = foundation;
  let helpLink: string;

  if (
    config.get('hostSettings:billing:enabled') === true &&
    config.get('hostSettings:billing:url')
  ) {
    helpLink = config.get('hostSettings:billing:url') as string;
  } else {
    helpLink = 'https://ghost.org/help/';
  }

  let subscription: Subscription | undefined;

  if (config.get('hostSettings:subscription')) {
    subscription = {
      startDate: config.get('hostSettings:subscription:start') as string,
      interval: 'month',
    };
  }

  const hostLimits = (config.get('hostSettings:limits') || {}) as LoadLimitsOptions['limits'];

  try {
    limitService.loadLimits({
      limits: hostLimits,
      subscription,
      // Read when a limit counts, so that building the limits does not build the database handle.
      db: {
        get knex() {
          return foundation.database as unknown as NonNullable<LoadLimitsOptions['db']>['knex'];
        },
      },
      helpLink,
      errors,
    });
  } catch (error) {
    // Do not block the boot process for an incorrect usage error
    if (error instanceof errors.IncorrectUsageError) {
      logger.warn(error);
    } else {
      throw error;
    }
  }
}

/**
 * The limits a host puts on the site: how many staff, members or emails, which integrations and
 * themes. Built from config the first time something asks whether a limit applies.
 */
export default defineService(
  'Limits',
  {
    create: ({ foundation }) => {
      const limitService = new LimitService();
      load(limitService, foundation);
      return limitService;
    },
  },
  { load },
);
