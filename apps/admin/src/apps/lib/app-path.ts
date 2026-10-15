import { AppPathSchema } from '@tryghost/app-contracts/bridge';
import { appRoute } from './routes';

/**
 * Returns the app's own route from Admin's URL: the part after `/apps/:installationId`, including
 * the query and fragment. Returns `/` when there is none, or when it isn't a path the app could
 * have reported, such as `//host`.
 */
export function appPathFromLocation(
  installationId: string,
  { pathname, search, hash }: { pathname: string; search: string; hash: string },
): string {
  const prefix = appRoute(installationId);
  const rest = pathname.startsWith(`${prefix}/`) ? pathname.slice(prefix.length) : '/';
  const path = `${rest}${search}${hash}`;
  return AppPathSchema.safeParse(path).data ?? '/';
}

/** Whether an Admin location shows the app's page, on any of the app's routes. */
export function isAppLocation(installationId: string, { pathname }: { pathname: string }): boolean {
  const prefix = appRoute(installationId);
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * Returns the Admin route that shows the app at one of the app's routes. The app's `/` maps to
 * `/apps/:installationId` itself.
 */
export function appPathRoute(installationId: string, path: string): string {
  const rest =
    path === '/' || path.startsWith('/?') || path.startsWith('/#') ? path.slice(1) : path;
  return `${appRoute(installationId)}${rest}`;
}
