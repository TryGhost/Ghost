/**
 * Mailgun clients reject with `{ error, messageData }`.
 *
 * If passed such an object, we return `error`. Otherwise, we return the input value.
 */
export const getMailgunError = (err: unknown): unknown =>
  typeof err === 'object' && err !== null && 'error' in err && err.error instanceof Error
    ? err.error
    : err;
