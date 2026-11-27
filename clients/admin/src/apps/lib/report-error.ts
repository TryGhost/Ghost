import * as Sentry from '@sentry/react';

/**
 * For a failure the Apps screens show only as a generic message.
 * The message the API sent can't be trusted, so it goes to the console and Sentry instead.
 */
export function reportAppsError(error: unknown): void {
  // eslint-disable-next-line no-console
  console.error(error);
  Sentry.captureException(error, { tags: { area: 'apps' } });
}
