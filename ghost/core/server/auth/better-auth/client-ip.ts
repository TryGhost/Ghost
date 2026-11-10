import type { NextFunction, Request, Response } from 'express';

/** Carries the client IP Express resolved to Better Auth; only Ghost sets it. */
export const CLIENT_IP_HEADER = 'x-ghost-client-ip';

/**
 * Replaces any copy of the client IP header a client sent with `req.ip`, as
 * `trust proxy` resolved it. Mount before every route that hands the request
 * headers to Better Auth.
 */
export function setClientIPHeader(req: Request, _res: Response, next: NextFunction) {
  delete req.headers[CLIENT_IP_HEADER];
  if (req.ip) {
    req.headers[CLIENT_IP_HEADER] = req.ip;
  }
  next();
}
