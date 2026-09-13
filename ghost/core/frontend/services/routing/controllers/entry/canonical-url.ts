import { format, parse } from 'node:url';
import type { Request } from 'express';
import type { Entry } from '../entry';

/**
 * Build the entry's canonical URL (its own pathname) carrying over the current
 * request's query string. Shared by the permalink and markdown-url redirects.
 */
export default function buildCanonicalUrl(
  req: Request,
  entry: Entry,
  canonicalPath?: string,
): string {
  return format({
    pathname: canonicalPath || parse(entry.url).pathname,
    search: parse(req.originalUrl).search,
  });
}
