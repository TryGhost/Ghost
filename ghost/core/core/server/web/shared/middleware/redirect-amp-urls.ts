import type { NextFunction, Request, Response } from 'express';
import urlUtils from '../../../../shared/url-utils';
import { removeOpenRedirectFromUrl } from '../utils';

/**
 * Redirects AMP URLs to their non-AMP equivalent.
 *
 * 1. Detect requests whose path ends with `/amp/` (case-insensitive) or `/amp` before a query-string
 * 2. Issue a 301 redirect to the same URL without that suffix, preserving the query string.
 *
 * Needs to sit early in the public-site middleware stack so that the request never reaches
 * the dynamic routers or results in a 404.
 *
 * Example:
 *   /welcome/amp/      -> /welcome/
 *   /welcome/amp/?q=1  -> /welcome/?q=1
 */
export function redirectAmpUrls(req: Request, res: Response, next: NextFunction) {
  const ampPattern = /\/amp\/?$/i;
  const url = new URL(req.url, 'http://example.com');

  if (!ampPattern.test(url.pathname)) {
    return next();
  }

  const sanitizedPath = url.pathname.replace(ampPattern, '/') + url.search;
  const redirectPath = removeOpenRedirectFromUrl(sanitizedPath);

  return urlUtils.redirect301(res, redirectPath);
}
