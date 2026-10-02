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
import { POST_DELETED, stateSaveError, toSaveError } from './error-mapping';

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
    ['a host limit', new HostLimitError(response(403), errorBody()), 'host-limit'],
    ['an unreachable server', new ServerUnreachableError(), 'transport'],
    ['maintenance', new MaintenanceError(response(503), ''), 'transport'],
    ['a timeout', new TimeoutError(), 'transport'],
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
  it('reports a failed save, a collision and a deleted post, and nothing otherwise', () => {
    const failure: SaveError = { kind: 'transport', message: 'offline' };
    const collision: SaveError = { kind: 'conflict', message: 'Saving failed!' };

    expect(stateSaveError({ kind: 'error', intent: 'field', error: failure })).toBe(failure);
    expect(stateSaveError({ kind: 'conflict', intent: 'field', error: collision })).toBe(collision);
    expect(stateSaveError({ kind: 'halted' })).toBe(POST_DELETED);
    expect(stateSaveError({ kind: 'saving', intent: 'field' })).toBeNull();
    expect(stateSaveError({ kind: 'idle' })).toBeNull();
  });
});
