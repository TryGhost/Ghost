import { z } from 'zod';

import { isContainedPath } from '../bridge/rules.ts';
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
  allowLocalhost: boolean;
  /**
   * The address the manifest was fetched from, already checked and so off Ghost's hosts,
   * which the paths in it resolve against.
   */
  base: string;
}

/**
 * How the manifest's shape gets its URL fields: one rule for every URL in it, asked once
 * per field. `linkOnly` marks a URL that is only ever linked to, never loaded.
 */
export type UrlField = (linkOnly?: boolean) => z.ZodType<string, string>;

const ROUTE_PROBLEM =
  'Expected a URL that resolves to a path starting with a single /, with no \\ in its query or fragment';
const PATH_PROBLEM = 'Expected a path on the manifest’s own origin, such as /admin';
// Two, so a reference that names one of them still names a host other than the other's.
const PLACEHOLDER_HOSTS = ['manifest-a.invalid', 'manifest-b.invalid'];

/** Whether a reference names a host, in any of the URL parser's spellings of one. */
const namesHost = (value: string) =>
  PLACEHOLDER_HOSTS.some((host) => URL.parse(value, `https://${host}/`)?.host !== host);

function isManifestItself(url: URL, base: string): boolean {
  return url.pathname === new URL(base).pathname;
}

/**
 * A URL in the manifest. What Ghost loads is written as a path, resolved against the
 * address the manifest was fetched from, so an app is one origin: the one Ghost fetches
 * the manifest from and challenges is the one every surface runs on. The manifest names
 * that address as its signed `manifest_url`, so the resolved URLs are as fixed as if they
 * were written out. `parseManifestUrl` keeps that origin off Ghost's hosts.
 *
 * `linkOnly` marks a URL that is only ever linked to, never loaded, which is absolute and
 * may be anywhere, the publisher's own site included.
 *
 * A loaded URL's path, query and fragment must also make a path `isContainedPath` accepts.
 * Admin opens the app there, as its entry route, and the SDK refuses a route that isn't one.
 * Resolving can still give one that isn't: `/.//admin` resolves to the path `//admin`, which
 * names a host, and a `\` in the query or fragment is left as it is. Only the page is opened
 * as a route, but every URL Ghost loads is held to the one rule.
 */
export function urlField({ allowLocalhost, base }: UrlRules, linkOnly = false) {
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
    // its own origin, which the manifest's would then not be, even when it's the same one
    // today. An empty one, or one that's only a query or fragment, would be the manifest
    // itself.
    const url = URL.canParse(value) || namesHost(value) ? null : URL.parse(value, base);
    if (!url || url.origin !== origin || isManifestItself(url, base)) {
      ctx.addIssue({ code: 'custom', message: PATH_PROBLEM });
      return z.NEVER;
    }
    const problem = checkResolvedUrl(url, allowLocalhost);
    if (problem) {
      ctx.addIssue({ code: 'custom', message: problem });
      return z.NEVER;
    }
    if (!isContainedPath(`${url.pathname}${url.search}${url.hash}`)) {
      ctx.addIssue({ code: 'custom', message: ROUTE_PROBLEM });
      return z.NEVER;
    }
    return url.href;
  });
}

const MAILTO_PROBLEM = 'Expected a mailto: link to one email address';
// No separators, and no control or format characters, which could hide or reorder what the mail
// client shows in its To field.
const EMAIL_ADDRESS =
  /^[^\s\p{Cc}\p{Cf}@,;:<>()[\]\\"?#%/]+@[^\s\p{Cc}\p{Cf}@,;:<>()[\]\\"?#%/]+\.[^\s\p{Cc}\p{Cf}@,;:<>()[\]\\"?#%/]+$/u;

/**
 * Everything after a `mailto:` link's scheme, decoded as a mail client decodes it. That's the
 * whole recipient list, query and fragment included: a mail client doesn't read `//` as an
 * authority, so the URL's `pathname` alone can miss a recipient.
 */
function mailtoRecipients(link: URL): string | null {
  try {
    return decodeURIComponent(link.href.slice('mailto:'.length));
  } catch {
    return null;
  }
}

/**
 * A link to an app's developer: a URL as `url(true)` holds it, or a `mailto:` link to one email
 * address. Ghost only ever links to it. A `mailto:` link takes no query or fragment, not even an
 * empty one, so it can't prefill a message or add recipients. The address is checked as a mail
 * client decodes it, so an escaped `,` can't add a second one.
 */
export function contactField(url: UrlField) {
  const web = url(true);
  return z.string('Expected an absolute URL').transform((value, ctx) => {
    if (!/^mailto:/i.test(value)) {
      const result = web.safeParse(value);
      if (!result.success) {
        for (const issue of result.error.issues) {
          ctx.addIssue({ code: 'custom', message: issue.message });
        }
        return z.NEVER;
      }
      return result.data;
    }
    const link = URL.parse(value);
    const recipients = link && mailtoRecipients(link);
    if (
      !link ||
      !recipients ||
      link.href.length > URL_MAX_LENGTH ||
      !EMAIL_ADDRESS.test(recipients)
    ) {
      ctx.addIssue({ code: 'custom', message: MAILTO_PROBLEM });
      return z.NEVER;
    }
    return link.href;
  });
}

/**
 * A URL as a manifest holds it once `parseManifest` has accepted it: absolute, and
 * already checked. Nothing is resolved or checked again, so a manifest accepted before the
 * site's URL changed still reads back.
 */
export const absoluteUrl: UrlField = () => z.url('Expected an absolute URL');
