import { AppPathSchema } from '@tryghost/app-contracts/bridge';
import { appRoute } from './routes';

// Only parsed against, never requested: it gives a path the URL parser's own spelling.
const BASE = 'https://app.invalid';

/**
 * A path as the URL parser spells it, with what needs escaping escaped once, so a path the
 * app reported and the same path read back from Admin's address compare equal.
 */
export function normaliseAppPath(path: string): string {
  const url = new URL(path, BASE);
  return `${url.pathname}${url.search}${url.hash}`;
}

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
  return AppPathSchema.safeParse(path).success ? normaliseAppPath(path) : '/';
}

/** Where Admin shows an app on one of its own routes. The app's `/` is the app's page. */
export function appPathRoute(installationId: string, path: string): string {
  const rest =
    path === '/' || path.startsWith('/?') || path.startsWith('/#') ? path.slice(1) : path;
  return `${appRoute(installationId)}${rest}`;
}
