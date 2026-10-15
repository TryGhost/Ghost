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
