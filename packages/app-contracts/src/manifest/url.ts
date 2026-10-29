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
  /**
   * The address the manifest was fetched from, already checked, which the paths in it
   * resolve against.
   */
  base: string;
}

/**
 * How the manifest's shape gets its URL fields: one rule for every URL in it, asked once
 * per field. `linkOnly` marks a URL that is only ever linked to, never loaded.
 */
export type UrlField = (linkOnly?: boolean) => z.ZodType<string, string>;

const PATH_PROBLEM = 'Expected a path on the manifest’s own origin, such as /admin';

/**
 * A URL in the manifest. What Ghost loads is written as a path, resolved against the
 * address the manifest was fetched from, so an app is one origin: the one Ghost fetches
 * the manifest from and challenges is the one every surface runs on. The manifest names
 * that address as its signed `manifest_url`, so the resolved URLs are as fixed as if they
 * were written out. A loaded URL never shares an origin with Ghost.
 *
 * `linkOnly` marks a URL that is only ever linked to, never loaded, which is absolute and
 * may be anywhere, the publisher's own site included.
 */
export function urlField({ ghostUrls, allowLocalhost, base }: UrlRules, linkOnly = false) {
  if (linkOnly) {
    return z.string('Expected an absolute URL').transform((value, ctx) => {
      const url = URL.parse(value);
      const problem = url ? checkResolvedUrl(url, allowLocalhost) : 'Expected an absolute URL';
      if (problem) {
        ctx.addIssue({ code: 'custom', message: problem });
        return z.NEVER;
      }
      return url!.href;
    });
  }
  const origin = new URL(base).origin;
  return z.string(PATH_PROBLEM).transform((value, ctx) => {
    // A path, or a path-relative reference. A URL with a scheme, or a `//host` one, names
    // its own origin, which the manifest's would then not be.
    const url = URL.canParse(value) ? null : URL.parse(value, base);
    if (!url || url.origin !== origin) {
      ctx.addIssue({ code: 'custom', message: PATH_PROBLEM });
      return z.NEVER;
    }
    const problem = checkResolvedUrl(url, allowLocalhost);
    if (problem) {
      ctx.addIssue({ code: 'custom', message: problem });
      return z.NEVER;
    }
    if (isGhostOrigin(url, ghostUrls)) {
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
