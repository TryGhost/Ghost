import { z } from 'zod';

import { isGhostOrigin } from './ghost-origin.ts';
import { URL_MAX_LENGTH } from './limits.ts';
import { isLocalhost } from './localhost.ts';

export const FRAGMENT_PROBLEM = 'Expected a URL without a fragment';

/**
 * Whether an address carries a fragment, even an empty one, which the parsed URL's `hash`
 * hides. A fragment never reaches the server, so a manifest address with one is a mistake or
 * a second spelling of the same address.
 */
export const hasFragment = (address: string) => address.includes('#');

/**
 * Checks a URL once the URL parser has read it, so the rules apply to the URL Ghost would
 * use. The length is measured on the parsed URL for the same reason, as that is what is
 * stored and checked again later.
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
  /** The URLs Ghost itself is served from, which no loaded URL may share an origin with. */
  ghostUrls: string[];
  allowLocalhost: boolean;
}

/**
 * How the manifest's shape gets its URL fields: one rule for every URL in it, asked once
 * per field. `linkOnly` marks a URL that is only ever linked to, never loaded.
 */
export type UrlField = (linkOnly?: boolean) => z.ZodType<string, string>;

/**
 * A URL Ghost will load, never on an origin Ghost is served from. `linkOnly` lifts that
 * last rule for a URL that is only ever linked to, which a publisher's own app may well
 * point at their own site.
 *
 * Only absolute URLs are accepted, so the manifest's signature covers every origin Ghost
 * loads or links to: the same signed bytes served from somewhere else still point at the
 * app that signed them.
 */
export function urlField({ ghostUrls, allowLocalhost }: UrlRules, linkOnly = false) {
  return z.string('Expected an absolute URL').transform((value, ctx) => {
    const url = URL.parse(value);
    if (!url) {
      ctx.addIssue({ code: 'custom', message: 'Expected an absolute URL' });
      return z.NEVER;
    }
    const problem = checkResolvedUrl(url, allowLocalhost);
    if (problem) {
      ctx.addIssue({ code: 'custom', message: problem });
      return z.NEVER;
    }
    if (!linkOnly && isGhostOrigin(url, ghostUrls)) {
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
