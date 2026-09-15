import type { NextFunction, Request, Response } from 'express';

import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import { LimitService } from '@tryghost/limit-service';

import config from '../../shared/config';

// Ghost's database module is plain JavaScript, so it has no types to import. The limit
// service only ever calls it as a query builder, which is the contract it declares.
const db = require('../data/db');

const limitService = new LimitService();

const init = () => {
  let helpLink: string;

  if (
    config.get('hostSettings:billing:enabled') &&
    config.get('hostSettings:billing:enabled') === true &&
    config.get('hostSettings:billing:url')
  ) {
    helpLink = config.get('hostSettings:billing:url');
  } else {
    helpLink = 'https://ghost.org/help/';
  }

  let subscription;

  if (config.get('hostSettings:subscription')) {
    subscription = {
      startDate: config.get('hostSettings:subscription:start'),
      interval: 'month' as const,
    };
  }

  const hostLimits = config.get('hostSettings:limits') || {};

  try {
    limitService.loadLimits({
      limits: hostLimits,
      subscription,
      db,
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
};

/**
 * Route guard for a feature a host can switch off, for the routes that exist only to
 * change it. Answers 403 with the host's own wording, which is a different thing to tell a
 * caller than the 404 a labs flag gives: the feature exists, this plan does not include it.
 */
const requireFeature = (limitName: string) =>
  async function requireFeatureMw(_req: Request, _res: Response, next: NextFunction) {
    try {
      await limitService.errorIfWouldGoOverLimit(limitName);
      next();
    } catch (err) {
      next(err);
    }
  };

export default limitService;

export { init, requireFeature };
