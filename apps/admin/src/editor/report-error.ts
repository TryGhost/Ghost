import * as Sentry from '@sentry/react';

export interface EditorErrorContext {
  tags?: Record<string, boolean | number | string>;
  contexts?: Record<string, Record<string, unknown>>;
}

/**
 * Reports an editor failure. Never rethrown: the editor recovers without losing
 * what the writer typed.
 */
export function reportEditorError(error: unknown, context?: EditorErrorContext): void {
  // eslint-disable-next-line no-console
  console.error(error);

  Sentry.captureException(error, context);
}

/** Reports a Lexical failure from any of the editor's Koenig instances. */
export function reportKoenigError(error: unknown): void {
  reportEditorError(error, {
    tags: { lexical: true },
    contexts: { koenig: { version: window['@tryghost/koenig-lexical']?.version } },
  });
}
