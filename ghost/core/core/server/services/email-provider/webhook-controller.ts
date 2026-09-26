import type { Request, Response, NextFunction } from 'express';
import type { EmailEventService } from './event-service';

export function emailWebhookController(service: Pick<EmailEventService, 'webhook'>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await service.webhook(String(req.params.source), {
        body: req.body,
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
