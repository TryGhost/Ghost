/**
 * Extensions to Express.
 */

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export {};
