import type { NextFunction, Request, RequestHandler, Response } from 'express';
import logging from '@tryghost/logging';
import { z } from 'zod';
import config from '../../../../shared/config';

// A CSP host source: an optional http(s) scheme, a host with an optional `*.` and an optional
// port, then an optional trailing slash, which is dropped. A wildcard needs at least two labels
// after it. Anything wider (`*`, `*.com`, a bare scheme) would let almost any site frame the
// site, and quotes or `;` would change the policy itself. Public suffixes such as `*.co.uk` can't
// be told apart from a site's own domain here.
const HOST_SOURCE =
  /^((?:https?:\/\/)?(?:\*\.(?=[a-z0-9-]+\.[a-z0-9-]))?[a-z0-9-]+(?:\.[a-z0-9-]+)*(?::\d{1,5})?)\/?$/i;

// `true`, `false`, one site, or a list of sites. On the command line `true` and `false` arrive as
// strings, and a list given through environment variables (`siteFrameProtection__0=…`) arrives as
// an object keyed by position.
const settingSchema = z.union([
  z.boolean(),
  z
    .string()
    .regex(/^(?:true|false)$/i)
    .transform((value) => value.toLowerCase() === 'true'),
  z.string().transform((site) => [site]),
  z.array(z.unknown()),
  z.record(z.string(), z.unknown()).transform((entries) =>
    Object.keys(entries)
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => entries[key]),
  ),
]);

function allowedFramers(entries: unknown[]): string[] {
  return entries.flatMap((entry) => {
    const match = typeof entry === 'string' ? HOST_SOURCE.exec(entry) : null;
    if (match) {
      return [match[1]];
    }
    logging.warn(
      `siteFrameProtection: ignoring ${JSON.stringify(entry)}, which isn't a site's address`,
    );
    return [];
  });
}

// Admin on the site's host but another port or protocol is an origin of its own, which frames the
// site's pages itself
function adminOrigin(): string[] {
  const adminUrl = config.getAdminUrl();
  if (!adminUrl) {
    return [];
  }
  const origin = new URL(adminUrl).origin;
  return origin === new URL(config.getSiteUrl()).origin ? [] : [origin];
}

function framePolicy(): string | null {
  if (config.hasSeparateAdminHost()) {
    return null;
  }

  const setting: unknown = config.get('siteFrameProtection');
  const parsed = settingSchema.safeParse(setting);
  let framers: string[] = [];
  if (!parsed.success) {
    logging.warn(
      `siteFrameProtection: ${JSON.stringify(setting)} isn't true, false, a site or a list of sites, so only the site and Admin may frame its pages`,
    );
  } else if (parsed.data === false) {
    return null;
  } else if (parsed.data !== true) {
    framers = allowedFramers(parsed.data);
  }

  return ["frame-ancestors 'self'", ...adminOrigin(), ...framers].join(' ');
}

/**
 * Where Admin is served on the site's host, the site's pages run on Admin's origin. Framed inside
 * Admin by another origin, such as a preview renderer, or opened in a window by one, such a page
 * could reach Admin. With `siteFrameProtection` on, only the site itself, Admin and the sites the
 * setting lists may frame its pages. A window opened on one of them by anything but the site's own
 * pages loses its link back to its opener, Admin included, since Admin sends no
 * `Cross-Origin-Opener-Policy` of its own.
 *
 * It can't cover a frame Admin puts directly in its own page, whose only ancestor is Admin, on the
 * site's own origin: that frame needs a guard of Admin's own.
 *
 * Besides stopping other sites embedding the site's pages, it costs two things. A sandboxed frame
 * whose popups don't escape its sandbox can't open the site's pages in one. A window that leaves
 * the site and comes back to it, as some sign-in flows do, loses its opener.
 *
 * It's opt-in for now, and Ghost 7.0 is to turn it on by default. A separate admin host lifts it.
 * Config doesn't change while Ghost runs, so the policy is worked out once, when the app is built.
 */
export function createSiteFrameProtection(): RequestHandler {
  const policy = framePolicy();

  if (!policy) {
    return (req: Request, res: Response, next: NextFunction) => next();
  }

  return (req: Request, res: Response, next: NextFunction) => {
    res.set('Content-Security-Policy', policy);
    res.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    next();
  };
}
