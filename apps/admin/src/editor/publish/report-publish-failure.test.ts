import { describe, expect, it, vi } from 'vitest';
import {
  APIError,
  HostLimitError,
  ServerUnreachableError,
  UnauthorizedError,
  ValidationError,
} from '@tryghost/admin-x-framework/errors';
import { reportEditorError, reportEditorNotice } from '@/editor/report-error';
import { LimitCheckError } from './publish-options';
import { reportPublishFailure } from './report-publish-failure';

vi.mock('@/editor/report-error', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/editor/report-error')>()),
  reportEditorError: vi.fn(),
  reportEditorNotice: vi.fn(),
}));

function apiError(status: number) {
  return new APIError(new Response(null, { status }));
}

describe('reportPublishFailure', () => {
  it('reports an unexpected failure the writer was shown, tagged with what they read', () => {
    const error = apiError(500);

    reportPublishFailure('retry-request', 'Retry failed', { error, postId: 'post-1' });

    expect(reportEditorError).toHaveBeenCalledWith(error, {
      tags: { shown_to_user: true, source: 'publish-flow', publish_failure: 'retry-request' },
      contexts: { ghost: { displayed_message: 'Retry failed' } },
      extra: { post_id: 'post-1' },
    });
  });

  it('reports an outcome without an exception as a message', () => {
    reportPublishFailure('email-unconfirmed', 'Could not confirm');

    expect(reportEditorNotice).toHaveBeenCalledWith('Could not confirm', expect.anything());
  });

  // The same rule `reportSaveFailure` leaves saves out by.
  it.each([
    [
      'a validation refusal',
      new ValidationError(new Response(null, { status: 422 }), {
        errors: [{ message: 'Invalid' } as never],
      }),
    ],
    ['a host limit', new HostLimitError({ message: 'Over your limit' })],
    ['an expired session', new UnauthorizedError(new Response(null, { status: 401 }), '')],
    ['a lost connection', new ServerUnreachableError()],
    ['a limit check that met an expired session', new LimitCheckError('emails', apiError(401))],
  ])('leaves out %s', (_case, error) => {
    vi.mocked(reportEditorError).mockClear();

    reportPublishFailure('limit-check', 'Shown', { error });

    expect(reportEditorError).not.toHaveBeenCalled();
  });

  it.each([
    ['a bad request Core gave no recognised type', apiError(400)],
    ['a missing post', apiError(404)],
    ['a server error', apiError(500)],
  ])('reports %s, as a failed save would be', (_case, error) => {
    vi.mocked(reportEditorError).mockClear();

    reportPublishFailure('publish-request', 'Shown', { error });

    expect(reportEditorError).toHaveBeenCalledTimes(1);
  });
});
