import type { NextFunction, Request, Response } from 'express';

import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import { LimitService } from '@tryghost/limit-service';
import type { Db, LimitConfig, Subscription } from '@tryghost/limit-service';

export interface LimitServiceInitOptions {
  limits: Record<string, LimitConfig>;
  subscription?: Subscription;
  helpLink: string;
  db: Db;
}

/**
 * The limits this site has. Read it where you need it rather than taking a reference as
 * your module loads: boot decides what a site's limits are after most of Ghost has been
 * loaded, and tests describe a host and decide again.
 */
export const service = new LimitService();

export function init(options: LimitServiceInitOptions): void {
  try {
    service.loadLimits({ ...options, errors });
  } catch (error) {
    // A misconfigured host should not stop Ghost starting. The site runs unlimited.
    if (!(error instanceof errors.IncorrectUsageError)) {
      throw error;
    }

    logging.warn(error);
  }
}

/**
 * Route guard for a feature a host can switch off, for the routes that exist only to
 * change it. Answers 403 with the host's own wording, which is a different thing to tell a
 * caller than the 404 a labs flag gives: the feature exists, this plan does not include it.
 */
export const requireFeature = (limitName: string) =>
  async function requireFeatureMw(_req: Request, _res: Response, next: NextFunction) {
    try {
      await service.errorIfWouldGoOverLimit(limitName);
      next();
    } catch (err) {
      next(err);
    }
  };
