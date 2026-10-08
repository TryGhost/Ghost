import { describe, expect, it } from 'vitest';
import {
  APIError,
  EmailError,
  HostLimitError,
  JSONError,
  MaintenanceError,
  RequestEntityTooLargeError,
  ServerUnreachableError,
  SessionExpiredError,
  TimeoutError,
  UnauthorizedError,
  ValidationError,
  type ErrorResponse,
} from '@tryghost/admin-x-framework/errors';
import type { SaveError } from '@/editor/engine/save-engine';
import {
  ACCESS_LOST,
  EDITOR_CRASHED,
  EMAIL_REFUSED_MESSAGE,
  POST_DELETED,
  isSessionInvalid,
  requestFailureMessage,
  stateSaveError,
  toSaveError,
} from './error-mapping';

function errorBody(overrides: Partial<ErrorResponse['errors'][number]> = {}): ErrorResponse {
  return {
    errors: [
      {
        code: '',
        context: null,
        details: null,
        ghostErrorCode: null,
        help: '',
        id: 'id',
        message: 'Saving failed.',
        property: null,
        type: 'InternalServerError',
        ...overrides,
      },
    ],
  };
}

function response(status: number): Response {
  return new Response(null, { status });
}

/** A response from the posts endpoint, whose URL the transport's summary names. */
function postsResponse(status: number): Response {
  const answered = new Response(null, { status });
  Object.defineProperty(answered, 'url', {
    value: 'http://localhost:2368/ghost/api/admin/posts/1/?formats=lexical',
  });
  return answered;
}

const NO_PERMISSION = errorBody({
  type: 'NoPermissionError',
  message: 'Permission error, cannot edit post.',
  context: 'You do not have permission to perform this action',
});

describe('toSaveError', () => {
  it.each<[string, unknown, string]>([
    // Core answers 409 for a collision, which no framework error class claims,
    // so the code is read ahead of the status it arrives with.
    [
      'a collision',
      new JSONError(response(409), errorBody({ code: 'UPDATE_COLLISION' })),
      'conflict',
    ],
    ['an expired session', new SessionExpiredError(response(401), errorBody()), 'session-invalid'],
    [
      'an unauthorized response',
      new UnauthorizedError(response(401), errorBody()),
      'session-invalid',
    ],
    // The framework classes Core's refusal of a writer who lost access as a ValidationError.
    ['a writer who lost access', new ValidationError(response(403), NO_PERMISSION), 'forbidden'],
    ['a host limit', new HostLimitError(response(403), errorBody()), 'host-limit'],
    ['an unreachable server', new ServerUnreachableError(), 'transport'],
    ['maintenance', new MaintenanceError(response(503), ''), 'transport'],
    ['a timeout', new TimeoutError(), 'transport'],
    // Core's error handler summarises the message and moves the model's sentence into context.
    [
      'a scheduled save of a post published since',
      new ValidationError(
        response(422),
        errorBody({
          type: 'ValidationError',
          message: 'Validation error, cannot edit post.',
          context: 'Your post is already published, please reload your page.',
        }),
      ),
      'conflict',
    ],
    [
      'any other refused edit',
      new ValidationError(
        response(422),
        errorBody({
          type: 'ValidationError',
          message: 'Validation error, cannot edit post.',
          context: 'Value in [posts.title] exceeds maximum length of 255 characters.',
        }),
      ),
      'validation',
    ],
    ['a validation failure', new ValidationError(response(422), errorBody()), 'validation'],
    ['a missing post', new APIError(response(404)), 'not-found'],
    ['an unprocessable body', new JSONError(response(422), errorBody()), 'validation'],
    [
      'a payload the server refuses',
      new RequestEntityTooLargeError(response(413), ''),
      'validation',
    ],
    [
      'a publish whose newsletter changed while it was being published',
      new JSONError(
        response(409),
        errorBody({
          type: 'UpdateCollisionError',
          message: 'Saving failed! Someone else is editing this post.',
          context: 'The post was changed while it was being published, please try again',
        }),
      ),
      'conflict',
    ],
    [
      'a session Core no longer authorizes',
      new UnauthorizedError(response(403), errorBody({ message: 'Authorization failed' })),
      'session-invalid',
    ],
    ['a server error', new JSONError(response(500), errorBody()), 'unknown'],
    ['a thrown non-error', 'broken', 'unknown'],
  ])('maps %s', (_label, error, kind) => {
    expect(toSaveError(error, 'fallback').kind).toBe(kind);
  });

  it('keeps the fallback message when the failure carries none', () => {
    expect(toSaveError({}, 'Could not save').message).toBe('Could not save');
  });

  it('carries the reason Core gave for a validation refusal', () => {
    const refusal = new ValidationError(
      response(422),
      errorBody({
        type: 'ValidationError',
        message: 'Validation error, cannot edit post.',
        context: 'Value in [posts.title] exceeds maximum length of 255 characters. posts.title',
      }),
    );

    expect(toSaveError(refusal, 'fallback')).toMatchObject({
      kind: 'validation',
      message: 'Value in [posts.title] exceeds maximum length of 255 characters. posts.title',
    });
  });

  it('carries the reason Core gave for a host limit', () => {
    const refusal = new HostLimitError(
      response(403),
      errorBody({
        type: 'HostLimitError',
        message: 'Host Limit error, cannot edit post.',
        context: 'Your plan supports up to 500 members, please upgrade to add more.',
      }),
    );

    expect(toSaveError(refusal, 'fallback')).toMatchObject({
      kind: 'host-limit',
      message: 'Your plan supports up to 500 members, please upgrade to add more.',
    });
  });

  it('carries the reason Core gave for refusing a writer who lost access', () => {
    expect(
      toSaveError(new ValidationError(response(403), NO_PERMISSION), 'fallback'),
    ).toMatchObject({
      kind: 'forbidden',
      message: 'You do not have permission to perform this action',
    });
  });

  it('keeps its own message for a refused payload that carries no reason', () => {
    const tooLarge = new RequestEntityTooLargeError(response(413), '');

    expect(toSaveError(tooLarge, 'fallback').message).toBe(tooLarge.message);
  });

  // Core's error handler summarises `message` and moves its own sentence into `context`.
  // Only a 4xx is a refusal Core words for the person; a 5xx's text is for logs.
  it.each<[string, unknown, string]>([
    [
      'a publish to an archived newsletter',
      new JSONError(
        postsResponse(400),
        errorBody({
          type: 'BadRequestError',
          message: 'Request not understood error, cannot edit post.',
          context: 'Cannot send email to archived newsletters',
        }),
      ),
      'Cannot send email to archived newsletters',
    ],
    [
      'a newsletter that matches no active newsletter',
      new JSONError(
        postsResponse(400),
        errorBody({
          type: 'BadRequestError',
          message: 'Request not understood error, cannot edit post.',
          context: 'The newsletter parameter doesn’t match any active newsletter.',
        }),
      ),
      'The newsletter parameter doesn’t match any active newsletter.',
    ],
    // Read by its class: Core gives this case no code, only a sentence naming a model relation.
    [
      'a post without a newsletter to send to',
      new EmailError(
        postsResponse(500),
        errorBody({
          type: 'EmailError',
          message: 'Error sending email!',
          context: 'The post does not have a newsletter relation',
        }),
      ),
      EMAIL_REFUSED_MESSAGE,
    ],
    [
      'a server error, whatever Core said about it',
      new JSONError(
        postsResponse(500),
        errorBody({
          type: 'InternalServerError',
          message: 'The email could not be sent.',
          context: 'ER_LOCK_DEADLOCK: Deadlock found when trying to get lock',
        }),
      ),
      'Couldn’t save this post.',
    ],
    [
      'a bad request that carries no reason',
      new JSONError(postsResponse(400), errorBody({ message: '', context: null })),
      'Couldn’t save this post.',
    ],
    [
      'a JSON failure that carries no reason',
      new JSONError(postsResponse(500), errorBody({ message: '', context: null })),
      'Couldn’t save this post.',
    ],
    [
      'a failure that is not JSON',
      new APIError(postsResponse(502), '<html>'),
      'Couldn’t save this post.',
    ],
  ])('shows %s as the writer reads it, never the transport’s summary', (_label, error, message) => {
    const mapped = toSaveError(error, 'Couldn’t save this post.');

    expect(mapped).toMatchObject({ kind: 'unknown', message });
    expect(mapped.message).not.toContain('while loading');
  });

  it('keeps an error’s own message when it is not the transport’s summary', () => {
    expect(requestFailureMessage(new Error('Boom'), 'fallback')).toBe('Boom');
    expect(requestFailureMessage(new TimeoutError(), 'fallback')).toBe(
      'Request timed out, please try again.',
    );
  });

  it('carries the cause for reporting', () => {
    const error = new ServerUnreachableError();
    expect(toSaveError(error, 'fallback').cause).toBe(error);
  });
});

describe('isSessionInvalid', () => {
  it.each<[string, unknown, boolean]>([
    ['an expired session', new SessionExpiredError(response(401), errorBody()), true],
    ['an unauthorized response', new UnauthorizedError(response(401), errorBody()), true],
    ['a bare 401', new APIError(response(401)), true],
    // The framework's response handler classes Core's 403 "Authorization failed" this way.
    [
      'a 403 Core answers for a session it no longer authorizes',
      new UnauthorizedError(response(403), errorBody({ message: 'Authorization failed' })),
      true,
    ],
    ['a writer who lost access', new ValidationError(response(403), NO_PERMISSION), false],
    ['a server error', new JSONError(response(500), errorBody()), false],
    ['an unreachable server', new ServerUnreachableError(), false],
  ])('reads %s', (_label, error, expected) => {
    expect(isSessionInvalid(error)).toBe(expected);
  });
});

describe('stateSaveError', () => {
  it('reports a failed save, a collision, a halt and a crash, and nothing otherwise', () => {
    const failure: SaveError = { kind: 'transport', message: 'offline' };
    const collision: SaveError = { kind: 'conflict', message: 'Saving failed!' };
    const missing: SaveError = { kind: 'not-found', message: 'Post not found.' };
    const refused: SaveError = { kind: 'forbidden', message: 'Permission error.' };

    expect(stateSaveError({ kind: 'error', intent: 'field', error: failure })).toBe(failure);
    expect(stateSaveError({ kind: 'conflict', intent: 'field', error: collision })).toBe(collision);
    expect(stateSaveError({ kind: 'halted', error: missing })).toBe(POST_DELETED);
    expect(stateSaveError({ kind: 'halted', error: refused })).toBe(ACCESS_LOST);
    expect(stateSaveError({ kind: 'crashed' })).toBe(EDITOR_CRASHED);
    expect(stateSaveError({ kind: 'saving', intent: 'field' })).toBeNull();
    expect(stateSaveError({ kind: 'idle' })).toBeNull();
  });
});
