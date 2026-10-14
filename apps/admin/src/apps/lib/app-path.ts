import { AppPathSchema } from '@tryghost/app-contracts/bridge';
import { appRoute } from './routes';

/**
 * The app's own route in Admin's address: what follows `/apps/:installationId`, with the
 * query and fragment. `/` when there is none, or when what is there isn't a path the app
 * could have reported, such as `//host`.
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

/** Whether a location of Admin's is the app's page, on any of the app's own routes. */
export function isAppLocation(installationId: string, { pathname }: { pathname: string }): boolean {
  const prefix = appRoute(installationId);
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Where Admin shows an app on one of its own routes. The app's `/` is the app's page. */
export function appPathRoute(installationId: string, path: string): string {
  const rest =
    path === '/' || path.startsWith('/?') || path.startsWith('/#') ? path.slice(1) : path;
  return `${appRoute(installationId)}${rest}`;
}
