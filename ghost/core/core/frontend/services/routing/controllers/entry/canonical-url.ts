import { format, parse } from 'node:url';
import type { Request } from 'express';
import type { Entry } from '../entry';

/**
 * Build the entry's canonical URL (its own pathname, unless a route stands in
 * for it) carrying over the current request's query string. Shared by the
 * permalink and markdown-url redirects.
 */
export default function buildCanonicalUrl(
  req: Request,
  entry: Entry,
  pathname = parse(entry.url).pathname,
): string {
  return format({
    pathname,
    search: parse(req.originalUrl).search,
  });
}
