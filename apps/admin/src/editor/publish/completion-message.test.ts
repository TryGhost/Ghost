import { describe, expect, it } from 'vitest';
import {
  APIError,
  HostLimitError,
  JSONError,
  ServerUnreachableError,
  UnauthorizedError,
  ValidationError,
  type ErrorResponse,
} from '@tryghost/admin-x-framework/errors';
import {
  CONFLICT_MESSAGE,
  CompletionFailureError,
  DELETED_MESSAGE,
  DROPPED_MESSAGE,
  HALTED_MESSAGE,
  REAUTH_MESSAGE,
  SESSION_ABANDONED_MESSAGE,
  SESSION_EXPIRED_MESSAGE,
  UNEXPECTED_MESSAGE,
  UNREACHABLE_MESSAGE,
  describeCompletionFailure,
  describeRejectedAction,
  describeSaveError,
} from '@/editor/publish/completion-message';
import { UNEXPECTED_ERROR_MESSAGE } from '@/editor/session/error-mapping';
import type { SaveCompletion, SaveError, SaveErrorKind } from '@/editor/engine/save-engine';

function failed(kind: SaveErrorKind, message = 'boom'): SaveCompletion {
  return { kind: 'failed', error: { kind, message }, executedAs: 'publish' };
}

describe('describeCompletionFailure', () => {
  it('returns nothing for a save that landed', () => {
    expect(
      describeCompletionFailure({
        kind: 'saved',
        result: { id: '1', status: 'published', updatedAt: 'now' },
        executedAs: 'publish',
      }),
    ).toBeNull();
  });

  it('sends a re-auth interruption back to confirm with an explanation', () => {
    expect(describeCompletionFailure({ kind: 'needs-retry' })).toEqual({
      message: REAUTH_MESSAGE,
      tone: 'info',
    });
    expect(describeCompletionFailure(failed('session-invalid'))).toEqual({
      message: SESSION_ABANDONED_MESSAGE,
    });
  });

  it('maps the engine error kinds onto the flow copy', () => {
    expect(describeCompletionFailure(failed('validation', 'Title is too long'))).toEqual({
      message: 'Validation failed: Title is too long',
    });
    expect(describeCompletionFailure(failed('transport'))).toEqual({
      message: UNREACHABLE_MESSAGE,
    });
    expect(describeCompletionFailure(failed('conflict'))).toEqual({ message: CONFLICT_MESSAGE });
    expect(describeCompletionFailure(failed('unknown', 'Something broke'))).toEqual({
      message: 'Something broke',
    });
  });

  it('splits a host limit so the upgrade phrase can be linked', () => {
    const failure = describeCompletionFailure(
      failed('host-limit', 'You have reached your limit, please upgrade to continue.'),
    );

    expect(failure?.parts).toEqual([
      { text: 'You have reached your limit, ', kind: 'text' },
      { text: 'please upgrade', kind: 'upgrade' },
      { text: ' to continue.', kind: 'text' },
    ]);
  });

  it('does not tell the writer to reload a post that was deleted or is out of reach', () => {
    expect(describeCompletionFailure(failed('not-found'))).toEqual({ message: DELETED_MESSAGE });
    expect(describeCompletionFailure({ kind: 'dropped', reason: 'halted' })).toEqual({
      message: HALTED_MESSAGE,
    });
  });

  it('treats a dropped or superseded command as no longer publishable', () => {
    expect(describeCompletionFailure({ kind: 'dropped', reason: 'not-draft' })).toEqual({
      message: DROPPED_MESSAGE,
    });
    expect(describeCompletionFailure({ kind: 'superseded', by: 'publish' })).toEqual({
      message: DROPPED_MESSAGE,
    });
  });
});

describe('describeSaveError', () => {
  it('shows a generic message for an exception thrown in the browser', () => {
    const cause = new TypeError("Cannot read properties of undefined (reading 'x')");

    expect(describeSaveError({ kind: 'unknown', message: cause.message, cause })).toEqual({
      message: UNEXPECTED_MESSAGE,
    });
  });

  it('keeps the message of an API error response', () => {
    const cause = new APIError(
      new Response(null, { status: 500 }),
      undefined,
      'Saving is paused while the site is migrated.',
    );

    expect(describeSaveError({ kind: 'unknown', message: cause.message, cause })).toEqual({
      message: 'Saving is paused while the site is migrated.',
    });
  });

  it.each<SaveErrorKind>([
    'validation',
    'transport',
    'conflict',
    'session-invalid',
    'host-limit',
    'not-found',
    'forbidden',
  ])('keeps the %s copy whatever caused it', (kind) => {
    const error: SaveError = { kind, message: 'Title is too long.' };

    expect(describeSaveError({ ...error, cause: new Error('boom') })).toEqual(
      describeSaveError(error),
    );
  });
});

function apiBody(error: Partial<ErrorResponse['errors'][number]>): ErrorResponse {
  return { errors: [error as ErrorResponse['errors'][number]] };
}

function response(status: number) {
  return new Response(null, { status });
}

describe('describeRejectedAction', () => {
  it('reads the reason Core gave rather than the transport’s summary', () => {
    const error = new JSONError(
      response(400),
      apiBody({ message: 'Cannot retry email because the delivery outcome is unknown' }),
      'Something went wrong while loading emails, please try again.',
    );

    expect(describeRejectedAction(error)).toEqual({
      message: 'Cannot retry email because the delivery outcome is unknown',
    });
  });

  it('uses the fallback for a JSON failure that gave no reason', () => {
    const answered = response(500);
    Object.defineProperty(answered, 'url', {
      value: 'http://localhost:2368/ghost/api/admin/emails/email-1/retry/',
    });
    // The transport names the endpoint: "Something went wrong while loading emails…".
    const error = new JSONError(answered, apiBody({}));

    expect(describeRejectedAction(error, 'Could not retry')).toEqual({
      message: 'Could not retry',
    });
  });

  it('says the session expired rather than that the request was unauthorised', () => {
    const error = new UnauthorizedError(response(401), '');

    expect(describeRejectedAction(error)).toEqual({ message: SESSION_EXPIRED_MESSAGE });
  });

  it('prefers the context Core explains a rewritten message with', () => {
    const error = new ValidationError(
      response(422),
      apiBody({ message: 'Validation error', context: 'Only failed emails can be retried' }),
    );

    expect(describeRejectedAction(error).message).toBe('Only failed emails can be retried');
  });

  it('keeps a host limit’s upgrade phrase linkable', () => {
    const error = new HostLimitError(
      response(403),
      apiBody({ message: 'Your plan is over its email limit, please upgrade to send more.' }),
    );

    expect(describeRejectedAction(error).parts).toContainEqual({
      text: 'please upgrade',
      kind: 'upgrade',
    });
  });

  it('keeps a described failure carried through a rejection', () => {
    const failure = { message: 'Your plan is full, please upgrade.', parts: [] };

    expect(describeRejectedAction(new CompletionFailureError(failure))).toBe(failure);
  });

  it('shows the generic fallback, not Core’s text, for a server error', () => {
    const error = new JSONError(
      response(500),
      apiBody({ message: 'Internal server error', context: 'ER_LOCK_DEADLOCK' }),
    );

    expect(describeRejectedAction(error)).toEqual({ message: UNEXPECTED_ERROR_MESSAGE });
    expect(describeRejectedAction(new JSONError(response(400), apiBody({})))).toEqual({
      message: UNEXPECTED_ERROR_MESSAGE,
    });
  });

  it('falls back when the response carried no reason, and says when it never arrived', () => {
    expect(describeRejectedAction(new APIError(response(502)), 'Retry failed')).toEqual({
      message: 'Retry failed',
    });
    expect(describeRejectedAction(new ServerUnreachableError())).toEqual({
      message: UNREACHABLE_MESSAGE,
    });
    expect(describeRejectedAction(new Error('The save engine stopped'))).toEqual({
      message: 'The save engine stopped',
    });
  });
});
