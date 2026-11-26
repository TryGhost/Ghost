import path from 'node:path';

const ADMIN_API = path.join(__dirname, '../../core/server/web/api/endpoints/admin');
const { permissionKey } = require('../../core/server/api/endpoints/utils/permissions');
// Required, not imported, so it is the copy the routes registered their handlers with
const { routedMethod } = require('@tryghost/api-framework');

/** The controller method a handler from `http()` runs, as `routedMethod` gives it. */
interface ControllerMethod {
  docName?: string;
  method?: string;
  permissions?: unknown;
}

interface Layer {
  handle: unknown;
  /** Set by `match`: the part of the path the layer matched */
  path?: string;
  regexp: RegExp & { fast_slash?: boolean };
  route?: {
    path: string | string[];
    methods: Record<string, boolean>;
    stack: Array<{ handle: unknown; method?: string }>;
  };
  match(path: string): boolean;
}

export interface MountedRouter {
  stack: Layer[];
}

export interface AdminApiRoute {
  /** As the bridge and the docs write a route: `GET /posts/:id` */
  route: string;
  /**
   * The controller method it ends in, by its controller's `docName`: `posts.read`. Null for a
   * route that ends in something the API pipeline didn't make.
   */
  mounts: string | null;
  /**
   * The permission key the API pipeline checks before the method runs, such as `post:read`, or
   * null when the method checks its own permissions or none.
   */
  permissionKey: string | null;
  /**
   * Everything a request to the route runs, in order: the middleware and the `all` routes
   * mounted ahead of it on its path, in every router above it, then its own handlers.
   */
  handlers: unknown[];
}

/** A path that fills each of a route's parameters with a value it accepts. */
export const examplePath = (routePath: string) =>
  routePath.replace(/:id\b/g, '5ddc9141c35e7700383b2937').replace(/:[a-z_]+/gi, 'example');

export const isRouter = (handle: unknown): handle is MountedRouter =>
  typeof handle === 'function' && Array.isArray((handle as { stack?: unknown }).stack);

/**
 * The path a router or a middleware was mounted at with `use`, or `''` for one mounted without
 * a path. Express keeps only the expression it made of the path, so this reads it back from
 * that, and checks the layer matches what it read.
 */
export function mountPathOf(layer: Layer): string {
  if (layer.regexp.fast_slash) {
    return '';
  }
  const mountPath = layer.regexp.source
    .replace(/^\^/, '')
    .replace(/\\\/\?\(\?=\\\/\|\$\)$/, '')
    .replace(/\\(.)/g, '$1');
  if (!layer.match(mountPath) || layer.path !== mountPath) {
    throw new Error(`Can't read the path a layer is mounted at from ${layer.regexp}`);
  }
  return mountPath;
}

/** What a request to `requestPath` runs in a layer it then passes on from. */
function passedThrough(layer: Layer, requestPath: string): unknown[] {
  if (!layer.match(requestPath)) {
    return [];
  }
  if (layer.route) {
    // A route mounted with `all` runs ahead of the routes after it, as authentication does
    return layer.route.methods._all ? layer.route.stack.map((each) => each.handle) : [];
  }
  // An error handler only runs for an error, and a router is walked for its own routes
  const { handle } = layer;
  return typeof handle !== 'function' || handle.length === 4 || isRouter(handle) ? [] : [handle];
}

function permissionKeyOf(method: ControllerMethod | undefined): string | null {
  const { docName, permissions } = method ?? {};
  if (!method?.method || !docName) {
    return null;
  }
  if (permissions === true) {
    return permissionKey({ docName, method: method.method });
  }
  if (permissions && typeof permissions === 'object') {
    // As the pipeline does, a method's `permissions` may name another docName or method
    return permissionKey({ docName, method: method.method, ...permissions });
  }
  return null;
}

function walk(
  router: MountedRouter,
  prefix: string,
  outer: (fullPath: string) => unknown[],
): AdminApiRoute[] {
  const routes: AdminApiRoute[] = [];
  const before: Layer[] = [];

  for (const layer of router.stack) {
    const ahead = [...before];
    const aheadOf = (fullPath: string) => [
      ...outer(fullPath),
      ...ahead.flatMap((each) => passedThrough(each, fullPath.slice(prefix.length) || '/')),
    ];

    if (layer.route) {
      const { route } = layer;
      for (const verb of Object.keys(route.methods).filter((each) => each !== '_all')) {
        for (const routePath of [route.path].flat()) {
          // Express answers a path with or without its trailing slash
          const full = `${prefix}${routePath}`.replace(/(.)\/$/, '$1');
          const own = route.stack.filter((each) => each.method === verb).map((each) => each.handle);
          const method: ControllerMethod | undefined = routedMethod(own.at(-1));
          routes.push({
            route: `${verb.toUpperCase()} ${full}`,
            mounts: method?.docName && method.method ? `${method.docName}.${method.method}` : null,
            permissionKey: permissionKeyOf(method),
            handlers: [...aheadOf(examplePath(full)), ...own],
          });
        }
      }
    } else if (isRouter(layer.handle)) {
      routes.push(...walk(layer.handle, `${prefix}${mountPathOf(layer)}`, aheadOf));
    }
    before.push(layer);
  }
  return routes;
}

/** The router the Admin API mounts. Built once: the routes file makes a new one each call. */
let mounted: MountedRouter | undefined;
export function adminApiRouter(): MountedRouter {
  // The routes file is CommonJS, so what it mounts is what `require` gives, not `import`
  mounted ??= require(path.join(ADMIN_API, 'routes.js'))() as MountedRouter;
  return mounted;
}

/**
 * Every route the Admin API mounts for a method, read from the router itself, in whatever
 * style it was mounted, with what a request to it runs and the permission key the pipeline
 * checks for it. A route on a router mounted under another is given its full path.
 */
export function adminApiRoutes(router: MountedRouter = adminApiRouter()): AdminApiRoute[] {
  return walk(router, '', () => []);
}
