import type { Router } from 'express';
import { toNodeHandler } from 'better-auth/node';
import type { GhostAuth } from '../../../../auth/better-auth';
import { setClientIPHeader } from '../../../../auth/better-auth/client-ip';

const express = require('../../../../../shared/express');

/** Serves Better Auth's native routes under `/auth/*`, which Better Auth rate limits itself. */
export function betterAuthRouter(auth: GhostAuth): Router {
  const router: Router = express.Router('admin api better auth');
  router.all('/auth/*', setClientIPHeader, toNodeHandler(auth));
  return router;
}
