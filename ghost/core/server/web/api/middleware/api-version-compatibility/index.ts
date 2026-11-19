import ghostVersion from '@tryghost/version';
import type { RequestHandler } from 'express';

/**
 * Set Content-Version on the response, and add 'Accept-Version' to VARY as
 * it effects response caching
 */
export const contentVersion: RequestHandler = (req, res, next) => {
  res.header('Content-Version', `v${ghostVersion.safe}`);
  res.vary('Accept-Version');

  next();
};

export { versionRewrites } from './mw-version-rewrites';
export { legacyApiPathMatch } from './legacy-api-path-match';
