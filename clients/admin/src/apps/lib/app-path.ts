import { AppPathSchema, normaliseAppPath } from '@tryghost/app-contracts/bridge';
import { appRoute } from './routes';

/**
 * The app's entry route: the path, query and fragment of the URL its page is served from, which
 * `/apps/:installationId` on its own stands for.
 */
export function appEntryPath(pageUrl: string): string {
  const { pathname, search, hash } = new URL(pageUrl);
  return normaliseAppPath(`${pathname}${search}${hash}`);
}

/**
 * Returns the app's route from Admin's URL: the part after `/apps/:installationId`, including the
 * query and fragment, or the app's entry route when there is no part after it. The entry route
 * is also what a part the app couldn't have reported, such as `//host`, gives.
 */
export function appPathFromLocation(
  installationId: string,
  { pathname, search, hash }: { pathname: string; search: string; hash: string },
  entryPath: string,
): string {
  const prefix = appRoute(installationId);
  if (!pathname.startsWith(`${prefix}/`)) {
    return entryPath;
  }
  const path = `${pathname.slice(prefix.length)}${search}${hash}`;
  return AppPathSchema.safeParse(path).data ?? entryPath;
}

/**
 * The address the app's frame loads to open the app at one of its routes: the route resolved
 * against the app's page. A route that resolves to another origin, or doesn't resolve at all,
 * gives the page itself instead. `AppPathSchema` already refuses such a route, but the frame
 * keeps the app's sandbox, `allow-same-origin` included, whatever it loads: a page from another
 * origin, such as the site's own, would run there with that origin's access. So the origin is
 * checked again where the address is made.
 */
export function appFrameUrl(pageUrl: string, path: string): string {
  let url: URL;
  try {
    url = new URL(path, pageUrl);
  } catch {
    return pageUrl;
  }
  return url.origin === new URL(pageUrl).origin ? url.href : pageUrl;
}

/** Whether an Admin location shows the app's page, on any of the app's routes. */
export function isAppLocation(installationId: string, { pathname }: { pathname: string }): boolean {
  const prefix = appRoute(installationId);
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * Returns the Admin route that shows the app at one of its routes: `/apps/:installationId` for
 * the entry route, and the route appended to it for any other, `/` included.
 */
export function appPathRoute(installationId: string, path: string, entryPath: string): string {
  return path === entryPath ? appRoute(installationId) : `${appRoute(installationId)}${path}`;
}
