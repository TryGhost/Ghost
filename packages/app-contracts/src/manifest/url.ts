import { z } from 'zod';

import { URL_MAX_LENGTH } from './limits.ts';

// `URL` has already normalised the host by the time these run: every spelling of an IPv4
// address is dotted decimal, and an IPv4-mapped IPv6 address is two hex groups.
const LOOPBACK_HOSTS = [
  /^localhost$/,
  /\.localhost$/,
  /^127\.\d+\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^\[::1?\]$/,
  /^\[::ffff:7f[0-9a-f]{2}:[0-9a-f]{1,4}\]$/,
  /^\[::ffff:0:0\]$/,
];

/** Whether a host is the machine itself: `localhost`, or a loopback or unspecified address. */
function isLocalhost(hostname: string): boolean {
  const host = hostname.replace(/\.$/, '');
  return LOOPBACK_HOSTS.some((pattern) => pattern.test(host));
}

/**
 * Checks a URL after it has been resolved, never before: a relative value can resolve to
 * another scheme or host, and only the result says what Ghost would load. The length is
 * measured here for the same reason, as the resolved URL is what is stored and checked
 * again later: a short relative path can resolve to more than the limit.
 */
export function checkResolvedUrl(url: URL, allowLocalhost: boolean): string | null {
  if (url.href.length > URL_MAX_LENGTH) {
    return `Expected at most ${URL_MAX_LENGTH} characters`;
  }
  if (url.username || url.password) {
    return 'Expected a URL without a username or password';
  }
  if (isLocalhost(url.hostname)) {
    if (!allowLocalhost) {
      return 'Expected a public address; localhost is only allowed when Ghost runs in development';
    }
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? null
      : 'Expected an http or https URL';
  }
  return url.protocol === 'https:' ? null : 'Expected an https URL';
}

export interface UrlRules {
  base: URL;
  ghostOrigins: Set<string | null>;
  allowLocalhost: boolean;
}

/**
 * How the manifest's shape gets its URL fields: one rule for every URL in it, asked once
 * per field. `linkOnly` marks a URL that is only ever linked to, never loaded.
 */
export type UrlField = (linkOnly?: boolean) => z.ZodType<string, string>;

/**
 * A URL Ghost will load: resolved against the manifest's own URL, and never on an origin
 * Ghost is served from. `linkOnly` lifts that last rule for a URL that is only ever
 * linked to, which a publisher's own app may well point at their own site.
 */
export function urlField({ base, ghostOrigins, allowLocalhost }: UrlRules, linkOnly = false) {
  return z
    .string('Expected a URL, or a path relative to the manifest')
    .min(1, 'Expected a URL, or a path relative to the manifest')
    .transform((value, ctx) => {
      let url: URL;
      try {
        url = new URL(value, base);
      } catch {
        ctx.addIssue({
          code: 'custom',
          message: 'Expected a URL, or a path relative to the manifest',
        });
        return z.NEVER;
      }
      const problem = checkResolvedUrl(url, allowLocalhost);
      if (problem) {
        ctx.addIssue({ code: 'custom', message: problem });
        return z.NEVER;
      }
      if (!linkOnly && ghostOrigins.has(url.origin)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Expected an address other than the one Ghost itself is served from',
        });
        return z.NEVER;
      }
      return url.href;
    });
}

/**
 * A URL as a manifest holds it once `parseManifest` has accepted it: absolute, and
 * already checked. Nothing is resolved or checked again, so a manifest accepted before the
 * site's URL changed still reads back.
 */
export const absoluteUrl: UrlField = () => z.url('Expected an absolute URL');
