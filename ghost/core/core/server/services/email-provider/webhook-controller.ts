import type { Request, Response, NextFunction } from 'express';
import type { EmailEventService } from './event-service';
import errors from '@tryghost/errors';

export function emailWebhookController(service: Pick<EmailEventService, 'webhook'>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      let body = req.body;
      if (!Buffer.isBuffer(body)) {
        // The raw parser leaves an empty object when the request has no body.
        if (
          body !== undefined &&
          body !== null &&
          (typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length)
        ) {
          throw new errors.BadRequestError({
            message: 'Email webhook requires a raw request body',
          });
        }
        body = Buffer.alloc(0);
      }
      const result = await service.webhook(String(req.params.source), {
        body,
        headers: req.headers,
      });
      if ('response' in result) {
        res
          .status(result.response.status)
          .type(result.response.contentType ?? 'text/plain')
          .send(result.response.body ?? '');
      } else {
        res.sendStatus(200);
      }
    } catch (error) {
      next(error);
    }
  };
}
