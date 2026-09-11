import type { RequestHandler } from 'express';
import { LimitService, type Subscription } from '@tryghost/limit-service';

import { counters, formatters } from './counters';

// These three are CommonJS with no types of their own.
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging') as { warn(message: unknown): void };
const config = require('../../../shared/config') as { get(key: string): unknown };

interface HostSettings {
  limits?: Record<string, Record<string, unknown>>;
  billing?: { enabled?: boolean; url?: string };
  subscription?: { start?: string; interval?: string };
}

const limitService = new LimitService();

/**
 * Build this site's limits from the configuration its host supplied.
 *
 * Safe to call again whenever that configuration changes: limits are resolved from scratch
 * and swapped in, and nothing holding a reference to this service needs to know.
 */
const init = (): void => {
  const hostSettings = (config.get('hostSettings') || {}) as HostSettings;

  const helpLink =
    hostSettings.billing?.enabled === true && hostSettings.billing?.url
      ? hostSettings.billing.url
      : 'https://ghost.org/help/';

  const subscription = hostSettings.subscription
    ? ({
        startDate: hostSettings.subscription.start,
        // Only monthly periods are supported; a host that names another gets a reported
        // problem rather than a limit that throws when something asks it a question.
        interval: (hostSettings.subscription.interval ?? 'month') as Subscription['interval'],
      } satisfies Subscription)
    : undefined;

  try {
    limitService.loadLimits({
      limits: hostSettings.limits || {},
      counters,
      formatters,
      subscription,
      helpLink,
      errors,
    });
  } catch (error) {
    // Misusing the limit service is a programming error, not a reason to stop a site
    // booting. Kept from before: configuration problems are reported rather than thrown
    // now, but a mistake here still must not take a site down.
    if (error instanceof errors.IncorrectUsageError) {
      logging.warn(error);
      return;
    }

    throw error;
  }

  // A limit its host is charging for that cannot be applied here is worth saying out loud.
  // Previously the first one of these took down every limit after it, silently.
  for (const problem of limitService.problems) {
    logging.warn(`Host limit "${problem.limit}" was configured but not applied: ${problem.reason}`);
  }
};

/**
 * Route guard for a feature a host can switch off, for the routes that exist only to
 * change it. Answers 403 with the host's own wording, which is a different thing to tell a
 * caller than the 404 a labs flag gives: the feature exists, this plan does not include it.
 */
const requireFeature = (limitName: string): RequestHandler =>
  async function requireFeatureMw(req, res, next) {
    try {
      await limitService.errorIfWouldGoOverLimit(limitName);
      next();
    } catch (err) {
      next(err);
    }
  };

module.exports = limitService;

module.exports.init = init;
module.exports.requireFeature = requireFeature;
