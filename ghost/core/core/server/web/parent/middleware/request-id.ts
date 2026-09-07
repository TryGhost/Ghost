import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = req.get('X-Request-ID') || crypto.randomUUID();

  // Set a value for internal use
  req.requestId = id;

  // If the header was set on the request, return it on the response
  if (req.get('X-Request-ID')) {
    res.set('X-Request-ID', id);
  }

  next();
}
