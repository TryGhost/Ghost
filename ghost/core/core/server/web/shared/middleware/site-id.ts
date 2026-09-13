import type { RequestHandler } from 'express';
import logging from '@tryghost/logging';

/**
 * Used by Ghost (Pro) to ensure that requests cannot be served by the wrong site.
 */
export const siteId = (expectedSiteId: string | number): RequestHandler => {
  return function siteIdMiddleware(req, res, next) {
    const headerSiteId = req.headers['x-site-id'];

    if (`${expectedSiteId}` === `${headerSiteId}`) {
      return next();
    }

    logging.warn(`Mismatched site id (expected ${expectedSiteId}, got ${headerSiteId})`);

    res.set({
      'Cache-Control':
        'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0',
    });
    res.writeHead(500);
    res.end();
  };
};
