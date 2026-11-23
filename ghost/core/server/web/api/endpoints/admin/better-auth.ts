import { text, type NextFunction, type Request, type Response, type Router } from 'express';
import { toNodeHandler } from 'better-auth/node';
import errors from '@tryghost/errors';
import type { GhostAuth } from '../../../../auth/better-auth';
import { setClientIPHeader } from '../../../../auth/better-auth/client-ip';

const express = require('../../../../../shared/express');

// Native routes carry credentials, tokens and WebAuthn assertions, all a few KB
export const BODY_SIZE_LIMIT = 64 * 1024;

/**
 * Better Auth's Node handler reads the body with no size limit, so read it
 * here first. better-call takes the string from `req.body` once the stream is
 * consumed, unchanged whatever its content type.
 */
function readBody(limit: number) {
  const parse = text({ type: () => true, limit });
  return function readBetterAuthBody(req: Request, res: Response, next: NextFunction) {
    parse(req, res, (err?: { type?: string }) => {
      if (err?.type === 'entity.too.large') {
        return next(
          new errors.RequestEntityTooLargeError({ message: 'Request body is too large.' }),
        );
      }
      // An empty string would reach Better Auth as an empty JSON body, which fails to parse
      if (req.body === '') {
        req.body = undefined;
      }
      next(err);
    });
  };
}

/** Serves Better Auth's native routes under `/auth/*`, which Better Auth rate limits itself. */
export function betterAuthRouter(auth: GhostAuth): Router {
  const router: Router = express.Router('admin api better auth');
  router.all('/auth/*', setClientIPHeader, readBody(BODY_SIZE_LIMIT), toNodeHandler(auth));
  return router;
}
