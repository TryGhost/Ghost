import { describe, expect, it } from 'vitest';
import {
  APIError,
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
  POST_DELETED,
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

  it('carries the cause for reporting', () => {
    const error = new ServerUnreachableError();
    expect(toSaveError(error, 'fallback').cause).toBe(error);
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
