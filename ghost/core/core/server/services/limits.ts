import type { NextFunction, Request, Response } from 'express';

import errors from '@tryghost/errors';
import { LimitService } from '@tryghost/limit-service';

import type { Db, LimitName, Limits, ParsedHostSettings } from '@tryghost/limit-service';

/**
 * What a site's limits are built from. The settings arrive already read, because only
 * something that has read a host's settings can produce them.
 */
export interface LimitServiceInitOptions {
  settings: ParsedHostSettings;
  helpLink: string;
  db: Db;
}

/**
 * The limits in force. A site starts limited by nothing, which is what a self-hosted site
 * stays for the life of the process; boot replaces this when a host says otherwise.
 */
let current: Limits = LimitService.unlimited(errors);

export function init(options: LimitServiceInitOptions): void {
  // Nothing a host can configure reaches here unread, so building cannot fail on account
  // of it. What a host got wrong was set aside and reported when its settings were read.
  current = new LimitService({ ...options, errors });
}

/**
 * This site's limits.
 *
 * One object for the life of the process, so that it can be taken as a dependency in the
 * ordinary way. Boot decides a site's limits after much of Ghost has been constructed, and
 * services that were handed the limits before that decision still have to see it; holding
 * the answer rather than the answerer is what makes that work.
 */
export const service: Limits = {
  get limits() {
    return current.limits;
  },
  set limits(value) {
    current.limits = value;
  },
  isLimited: (name) => current.isLimited(name),
  isDisabled: (name) => current.isDisabled(name),
  checkIsOverLimit: (name, options) => current.checkIsOverLimit(name, options),
  checkWouldGoOverLimit: (name, options) => current.checkWouldGoOverLimit(name, options),
  checkIfAnyOverLimit: (options) => current.checkIfAnyOverLimit(options),
  errorIfIsOverLimit: (name, options) => current.errorIfIsOverLimit(name, options),
  errorIfWouldGoOverLimit: (name, options) => current.errorIfWouldGoOverLimit(name, options),
};

/**
 * Route guard for a feature a host can switch off, for the routes that exist only to
 * change it. Answers 403 with the host's own wording, which is a different thing to tell a
 * caller than the 404 a labs flag gives: the feature exists, this plan does not include it.
 */
export const requireFeature = (limitName: LimitName) =>
  async function requireFeatureMw(_req: Request, _res: Response, next: NextFunction) {
    try {
      await service.errorIfWouldGoOverLimit(limitName);
      next();
    } catch (err) {
      next(err);
    }
  };
