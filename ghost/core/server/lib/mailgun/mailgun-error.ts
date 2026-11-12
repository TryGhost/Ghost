import errors from '@tryghost/errors';

/**
 * Mailgun clients reject with `{ error, messageData }`.
 *
 * If passed such an object, we wrap `error` with Mailgun context. Otherwise, we return the input value.
 */
export const getMailgunError = (err: unknown): unknown =>
  typeof err === 'object' && err !== null && 'error' in err && err.error instanceof Error
    ? new errors.EmailError({
        message: `Mailgun error: ${err.error.message}`,
        err: err.error,
      })
    : err;
