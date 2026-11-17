import path from 'node:path';
import { IncorrectUsageError } from '@tryghost/errors';
import type { RequestHandler, Router } from 'express';
import { domainRoutes } from '../../../../bootstrap/domains/fragments';
import { domainEndpoint } from '../../api/domain-endpoints';

const { http } = require('@tryghost/api-framework');

/**
 * Mounts the routes every domain declares for one HTTP surface. A domain
 * describes its routes as data (http/routes.ts): a method, a path, middleware
 * by name and a handler by file and member. Express, the middleware functions
 * and the API pipeline stay here in the web layer.
 *
 * The routes files are read when this is called. A handler's endpoint file is
 * loaded by the first request to one of its routes.
 *
 * @param router - The router or app to mount on.
 * @param options.surface - Which routes to mount: 'admin', 'content' or 'members'.
 * @param options.middleware - The middleware a route may name.
 * @param options.apiType - 'content' when handlers use the Content API's pipeline.
 */
export function mountDomainRoutes(
  router: Pick<Router, 'get' | 'post' | 'put' | 'patch' | 'delete'>,
  options: {
    surface: string;
    middleware: Record<string, RequestHandler | RequestHandler[] | undefined>;
    apiType?: 'content';
  },
) {
  for (const route of domainRoutes(options.surface)) {
    const stack = (route.middleware ?? []).map((name) => {
      const middleware = Object.hasOwn(options.middleware, name)
        ? options.middleware[name]
        : undefined;
      if (!middleware) {
        throw new IncorrectUsageError({
          message: `ghost/domains/${route.domain}/http/routes names the middleware ${name}, which the ${options.surface} surface does not have.`,
        });
      }
      return middleware;
    });

    let handler: RequestHandler | undefined;
    const lazily: RequestHandler = (req, res, next) => {
      if (!handler) {
        const endpoint = domainEndpoint(
          route.domain,
          path.basename(route.handlerModule),
          options.apiType,
        )[route.handlerMember];
        if (!endpoint) {
          next(
            new IncorrectUsageError({
              message: `ghost/domains/${route.domain}/http/routes names ${route.handler}, which does not exist.`,
            }),
          );
          return;
        }
        handler = http(endpoint) as RequestHandler;
      }
      return handler(req, res, next);
    };
    router[route.method](route.path, ...stack.flat(), lazily);
  }
}
