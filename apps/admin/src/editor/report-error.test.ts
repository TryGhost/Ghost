import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as Sentry from '@sentry/react';
import { APIError, ServerUnreachableError } from '@tryghost/admin-x-framework/errors';
import type { SaveCommand, SaveError } from '@/editor/engine/save-engine';
import type { EditorSaveFailure } from '@/editor/session/editor-session';
import {
  reportEditorError,
  reportKoenigError,
  reportLeaveConfirmation,
  reportSaveFailure,
  reportShownAlert,
} from './report-error';

vi.mock('@sentry/react', () => ({ captureException: vi.fn(), captureMessage: vi.fn() }));

const FIELD: SaveCommand = {
  kind: 'field',
  requiresRevision: false,
  requiresReconfirmation: false,
};

function failure(overrides: Partial<EditorSaveFailure> = {}): EditorSaveFailure {
  return {
    command: FIELD,
    error: { kind: 'unknown', message: 'Boom', cause: new Error('Boom') },
    persisted: true,
    durationMs: 120,
    postId: 'post-1',
    status: 'draft',
    ...overrides,
  };
}

const TAGS = {
  savePostTask: true,
  post_type: 'post',
  save_intent: 'field',
  save_error_kind: 'unknown',
  save_persisted: true,
  save_status: 'draft',
};

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(Sentry.captureException).mockClear();
  vi.mocked(Sentry.captureMessage).mockClear();
});

describe('reportEditorError', () => {
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

describe('reportSaveFailure', () => {
  it('reports the failing request with what it was and which post it was for', () => {
    const cause = new Error('Boom');

    reportSaveFailure(failure({ error: { kind: 'unknown', message: 'Boom', cause } }), 'post');

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledWith(cause, {
      tags: TAGS,
      extra: { post_id: 'post-1', duration_ms: 120 },
    });
    // eslint-disable-next-line no-console
    expect(console.error).toHaveBeenCalledWith(cause);
  });

  it('builds an error from the message when the failure has no cause', () => {
    reportSaveFailure(
      failure({ error: { kind: 'unknown', message: 'No record came back' } }),
      'page',
    );

    expect(Sentry.captureException).toHaveBeenCalledWith(new Error('No record came back'), {
      tags: { ...TAGS, post_type: 'page' },
      extra: { post_id: 'post-1', duration_ms: 120 },
    });
  });

  it.each<[string, SaveCommand['kind']]>([
    ['an autosave', 'autosave'],
    ['the timed cycle', 'timed'],
    ['a leave save', 'leave'],
    ['a publish', 'publish'],
  ])('tags a failure from %s with its intent', (_label, kind) => {
    reportSaveFailure(failure({ command: { ...FIELD, kind } }), 'post');

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(vi.mocked(Sentry.captureException).mock.calls[0][1]).toMatchObject({
      tags: { save_intent: kind },
    });
  });

  it('reports a collision with its kind and the persisted status', () => {
    const cause = new Error('Saving failed! Someone else is editing this post.');

    reportSaveFailure(
      failure({
        command: { ...FIELD, kind: 'explicit', requiresRevision: true },
        error: { kind: 'conflict', message: cause.message, cause },
        status: 'published',
      }),
      'post',
    );

    expect(Sentry.captureException).toHaveBeenCalledWith(cause, {
      tags: {
        ...TAGS,
        save_intent: 'explicit',
        save_error_kind: 'conflict',
        save_status: 'published',
      },
      extra: { post_id: 'post-1', duration_ms: 120 },
    });
  });

  it('reports an abandoned re-authentication as the session failure it was', () => {
    const cause = new Error('Unauthorized');

    reportSaveFailure(
      failure({ error: { kind: 'session-invalid', message: 'Unauthorized', cause } }),
      'post',
    );

    expect(Sentry.captureException).toHaveBeenCalledWith(cause, {
      tags: { ...TAGS, save_error_kind: 'session-invalid' },
      extra: { post_id: 'post-1', duration_ms: 120 },
    });
  });

  it('reports a persisted post that is gone as a message carrying the post id', () => {
    reportSaveFailure(
      failure({ error: { kind: 'not-found', message: 'Post not found', cause: new Error('404') } }),
      'page',
    );

    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
    expect(Sentry.captureMessage).toHaveBeenCalledWith('Attempted to edit deleted page', {
      tags: { ...TAGS, post_type: 'page', save_error_kind: 'not-found' },
      extra: { post_id: 'post-1' },
    });
  });

  it('reports a not-found on an unpersisted post as an exception', () => {
    const cause = new Error('404');

    reportSaveFailure(
      failure({
        error: { kind: 'not-found', message: 'Post not found', cause },
        persisted: false,
        postId: null,
      }),
      'post',
    );

    expect(Sentry.captureMessage).not.toHaveBeenCalled();
    expect(Sentry.captureException).toHaveBeenCalledWith(cause, {
      tags: { ...TAGS, save_error_kind: 'not-found', save_persisted: false },
      extra: { post_id: null, duration_ms: 120 },
    });
  });

  it.each<[string, SaveError]>([
    ['a validation failure', { kind: 'validation', message: 'Title is too long' }],
    ['a host limit', { kind: 'host-limit', message: 'Upgrade required' }],
    [
      'an unreachable server',
      { kind: 'transport', message: 'Unreachable', cause: new ServerUnreachableError() },
    ],
  ])('sends nothing for %s', (_label, error) => {
    reportSaveFailure(failure({ error }), 'post');

    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
    // eslint-disable-next-line no-console
    expect(console.error).not.toHaveBeenCalled();
  });

  it('reports a failure that took more than two seconds with its timing as well', () => {
    const cause = new ServerUnreachableError();

    reportSaveFailure(
      failure({
        command: {
          kind: 'publish',
          requiresRevision: true,
          requiresReconfirmation: true,
          target: { status: 'published', publishedAt: null, emailSegment: 'status:free' },
        },
        error: { kind: 'transport', message: 'Unreachable', cause },
        durationMs: 2001,
      }),
      'post',
    );

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledWith('Failed Lexical save took > 2s', {
      tags: {
        ...TAGS,
        save_intent: 'publish',
        save_error_kind: 'transport',
        save_time: 3,
        save_revision: true,
        email_segment: 'status:free',
      },
      extra: { post_id: 'post-1' },
    });
  });

  it('omits the email segment tag from a slow failure that carried none', () => {
    reportSaveFailure(failure({ durationMs: 2001 }), 'post');

    expect(Sentry.captureException).toHaveBeenCalledTimes(2);
    expect(vi.mocked(Sentry.captureException).mock.calls[0][1]).toStrictEqual({
      tags: { ...TAGS, save_time: 3, save_revision: false },
      extra: { post_id: 'post-1' },
    });
  });

  it('sends no timing for a failure that never reached the transport', () => {
    reportSaveFailure(failure({ durationMs: null }), 'post');

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(vi.mocked(Sentry.captureException).mock.calls[0][1]).toMatchObject({
      extra: { post_id: 'post-1', duration_ms: null },
    });
  });
});

describe('reportSaveFailure response tags', () => {
  it('tags a failure the server answered with its status', () => {
    const cause = new APIError(new Response(null, { status: 500 }));

    reportSaveFailure(failure({ error: { kind: 'unknown', message: 'Boom', cause } }), 'post');

    expect(Sentry.captureException).toHaveBeenCalledWith(cause, {
      tags: { ...TAGS, api_response_status: 500 },
      extra: { post_id: 'post-1', duration_ms: 120 },
    });
  });

  it('carries no response tags for a failure that never got an answer', () => {
    reportSaveFailure(
      failure({ error: { kind: 'unknown', message: 'Boom', cause: new Error() } }),
      'post',
    );

    const context = vi.mocked(Sentry.captureException).mock.calls[0][1] as { tags: object };
    expect(Object.keys(context.tags)).not.toContain('api_response_status');
    expect(Object.keys(context.tags)).not.toContain('api_url');
  });
});

describe('reportShownAlert', () => {
  it('reports the banner text the writer read with the failure behind it', () => {
    const cause = new APIError(new Response(null, { status: 409 }));

    reportShownAlert('Someone else is editing this post.', {
      kind: 'conflict',
      message: 'Saving failed!',
      cause,
    });

    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
    expect(Sentry.captureMessage).toHaveBeenCalledWith('Someone else is editing this post.', {
      tags: {
        shown_to_user: true,
        source: 'editor-banner',
        save_error_kind: 'conflict',
        api_response_status: 409,
      },
      contexts: {
        ghost: {
          displayed_message: 'Someone else is editing this post.',
          save_error_message: 'Saving failed!',
        },
      },
    });
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});

describe('reportLeaveConfirmation', () => {
  it('reports the leave prompt with why the post counted as unsaved', () => {
    reportLeaveConfirmation(
      {
        postId: 'post-1',
        status: 'draft',
        engineState: 'error',
        reasons: ['POST_HAS_ERROR', 'SCRATCH_DIVERGED_FROM_SECONDARY'],
      },
      'post',
    );

    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
    expect(Sentry.captureMessage).toHaveBeenCalledWith('showing leave editor modal', {
      tags: {
        post_type: 'post',
        save_status: 'draft',
        engine_state: 'error',
        leave_reasons: 'POST_HAS_ERROR,SCRATCH_DIVERGED_FROM_SECONDARY',
      },
      extra: { post_id: 'post-1', reasons: ['POST_HAS_ERROR', 'SCRATCH_DIVERGED_FROM_SECONDARY'] },
    });
  });
});
