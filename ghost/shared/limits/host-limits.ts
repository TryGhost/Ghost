import errors from '@tryghost/errors';
import type { LimitService, Subscription } from '@tryghost/limit-service';
import type { Foundation } from '@tryghost/kernel/foundation';

/**
 * Loads the limits the host configured (`hostSettings:limits`) into a limit
 * service, replacing what it held.
 *
 * A limit that is configured wrongly is logged and does not fail the caller:
 * a host's mistake must not stop the site from booting.
 */
export function loadHostLimits(
  limits: LimitService,
  { config, database, logging }: Pick<Foundation, 'config' | 'database' | 'logging'>,
): void {
  const billing = config.get('hostSettings:billing') as
    | { enabled?: boolean; url?: string }
    | undefined;
  const helpLink =
    billing?.enabled === true && billing.url ? billing.url : 'https://ghost.org/help/';

  const configured = config.get('hostSettings:subscription') as { start?: string } | undefined;
  const subscription: Subscription | undefined = configured
    ? { startDate: configured.start as Subscription['startDate'], interval: 'month' }
    : undefined;

  try {
    limits.loadLimits({
      limits: (config.get('hostSettings:limits') || {}) as Parameters<
        LimitService['loadLimits']
      >[0]['limits'],
      subscription,
      db: database,
      helpLink,
      errors,
    });
  } catch (error) {
    if (error instanceof errors.IncorrectUsageError) {
      logging.warn(error);
    } else {
      throw error;
    }
  }
}
