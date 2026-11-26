import { METHODS } from 'node:http';
import errors from '@tryghost/errors';
import type { IRoute, RequestHandler, Router } from 'express';
import { authenticatesAppTokens, refuseUnauthenticatedAppToken } from '../../../../auth/app-token';

type Mount = (this: unknown, ...args: unknown[]) => unknown;

// Express gives a route one method for each of these, and `all`
const VERBS = ['all', ...METHODS.map((method) => method.toLowerCase())];

const isRouter = (handler: unknown) =>
  typeof handler === 'function' && Array.isArray((handler as { stack?: unknown }).stack);

/**
 * The handlers as given, unless app token authentication isn't the first of them: then the
 * refusal of an unauthenticated app token goes ahead of them all.
 */
function refusingFirst(handlers: unknown[]): unknown[] {
  const [first] = handlers.flat(Infinity);
  return authenticatesAppTokens(first) ? handlers : [refuseUnauthenticatedAppToken, ...handlers];
}

/**
 * Makes a router refuse an app's token by default. A route mounted on it afterwards is open to
 * a request carrying one only when app token authentication is the first thing the route runs,
 * as it is in the Admin API's chains for private and for public endpoints. Every other route
 * starts with `refuseUnauthenticatedAppToken`, so it refuses the request ahead of everything
 * else on it, its rate limiters included.
 *
 * The decision is made as each route is mounted, from the handlers it is mounted with, so a
 * route added without authentication, or with something ahead of it, is closed to apps with
 * nothing to remember. It covers every way of mounting one:
 *
 * - `router.get(path, …)` and the other verbs make their route with `router.route(path)`, as
 *   `router.route(path).get(…)` does by hand, so the route that makes is the one wrapped.
 * - Anything mounted at a path with `router.use(path, …)` has the refusal ahead of it. A
 *   router's own routes are open to a token only once something ahead of the router has
 *   authenticated it: see `mountAuthenticated`. A router mounted without a path throws, as the
 *   refusal ahead of it would close every route mounted after it.
 *
 * Middleware mounted with `router.use(…)` and no path is left alone: it runs for every request
 * and passes it on, so it has to be safe for one that carries an app token nothing has
 * authenticated yet.
 */
export function refuseAppTokensByDefault<T extends Router>(router: T): T {
  const mounts = router as unknown as Record<string, Mount>;

  const route = mounts.route as Mount;
  mounts.route = function makeRoute(...args) {
    const made = route.apply(this, args) as IRoute & Record<string, Mount>;
    for (const verb of VERBS) {
      const mount = made[verb];
      if (typeof mount === 'function') {
        made[verb] = function mountHandlers(...handlers) {
          return mount.apply(this, refusingFirst(handlers));
        };
      }
    }
    return made;
  };

  const use = mounts.use as Mount;
  mounts.use = function mountMiddleware(...args) {
    // As Express reads its arguments: the first is a path unless it is, or starts with, a handler
    let first = args[0];
    while (Array.isArray(first) && first.length > 0) {
      first = first[0];
    }
    const atPath = typeof first !== 'function';
    const handlers = args.slice(atPath ? 1 : 0);
    if (atPath) {
      return use.apply(this, [args[0], ...refusingFirst(handlers)]);
    }
    // A refusal ahead of it would be at `/`, closing every route mounted after it to apps
    if (handlers.flat(Infinity).some(isRouter)) {
      throw new errors.IncorrectUsageError({
        message: 'Mount a router at a path on a router that refuses app tokens by default',
      });
    }
    return use.apply(this, args);
  };

  return router;
}

/**
 * Mounts a router under a path, behind an authentication chain. The chain runs as a route of
 * the parent, ahead of the mount, rather than inside it: mounting strips the path from
 * `req.url`, and the check on integration keys names the resource from its first segment, so
 * inside the mount it would see the child's own path and refuse them.
 *
 * On a parent that refuses app tokens by default, the child's routes are open to an app token
 * only when the chain starts with app token authentication.
 */
export function mountAuthenticated(
  parent: Router,
  path: string,
  chain: RequestHandler[],
  child: Router,
): void {
  parent.all([path, `${path}/*`], chain);
  parent.use(path, child);
}
