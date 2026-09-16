import type * as express from 'express';
// @ts-expect-error This module lacks type definitions.
import ghostVersion from '@tryghost/version';

/**
 * Expose the standard locals that every request will need to have available
 */
export function ghostLocals(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  // Make sure we have a locals value.
  res.locals = res.locals || {};
  // The current Ghost version
  res.locals.version = ghostVersion.full;
  // The current Ghost version, but only major.minor
  res.locals.safeVersion = ghostVersion.safe;
  // relative path from the URL
  res.locals.relativeUrl = req.path;

  next();
}
