import { describe, expect, it, vi } from 'vitest';
import {
  APIError,
  HostLimitError,
  ServerUnreachableError,
} from '@tryghost/admin-x-framework/errors';
import { reportEditorError, reportEditorNotice } from '@/editor/report-error';
import { LimitCheckError } from './publish-options';
import { reportPublishFailure } from './report-publish-failure';

vi.mock('@/editor/report-error', () => ({
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

  it.each([
    ['a refusal Core sent', apiError(400)],
    ['a host limit', new HostLimitError({ message: 'Over your limit' })],
    ['a lost connection', new ServerUnreachableError()],
    ['a limit check that lost its connection', new LimitCheckError('emails', apiError(401))],
  ])('leaves out %s', (_case, error) => {
    vi.mocked(reportEditorError).mockClear();

    reportPublishFailure('limit-check', 'Shown', { error });

    expect(reportEditorError).not.toHaveBeenCalled();
  });
});
