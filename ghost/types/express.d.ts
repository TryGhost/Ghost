/**
 * Extensions to Express.
 */

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      /** Requests waiting in the request queue when this one arrived */
      queueDepth?: number;
      /** Extra fields added to the request log line */
      extra?: Record<string, unknown>;
    }
  }
}

export {};
