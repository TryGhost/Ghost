import * as Sentry from '@sentry/react';

/**
 * Reports a Lexical failure from any of the editor's Koenig instances. Never
 * rethrown: Lexical attempts to recover without losing what the writer typed.
 */
export function reportKoenigError(error: unknown): void {
  // eslint-disable-next-line no-console
  console.error(error);

  Sentry.captureException(error, {
    tags: { lexical: true },
    contexts: { koenig: { version: window['@tryghost/koenig-lexical']?.version } },
  });
}
