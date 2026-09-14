import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as Sentry from '@sentry/react';
import { reportEditorError, reportKoenigError } from './report-error';

vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));

describe('reportEditorError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.mocked(Sentry.captureException).mockClear();
  });

  it('forwards the error to Sentry with the given context and logs it once', () => {
    const error = new Error('boom');

    reportEditorError(error, { tags: { lexical: true } });

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledWith(error, { tags: { lexical: true } });
    // eslint-disable-next-line no-console
    expect(console.error).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line no-console
    expect(console.error).toHaveBeenCalledWith(error);
  });

  it('forwards the error without a context when none is given', () => {
    const error = new Error('boom');

    reportEditorError(error);

    expect(Sentry.captureException).toHaveBeenCalledWith(error, undefined);
  });

  it('tags Koenig failures with the Lexical version', () => {
    window['@tryghost/koenig-lexical'] = { version: '1.2.3' };
    const error = new Error('lexical exploded');

    reportKoenigError(error);

    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      tags: { lexical: true },
      contexts: { koenig: { version: '1.2.3' } },
    });
  });
});
