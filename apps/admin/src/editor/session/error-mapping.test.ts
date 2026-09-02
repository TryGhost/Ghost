import { describe, expect, it } from 'vitest';
import {
  APIError,
  HostLimitError,
  JSONError,
  MaintenanceError,
  ServerUnreachableError,
  SessionExpiredError,
  TimeoutError,
  UnauthorizedError,
  ValidationError,
  type ErrorResponse,
} from '@tryghost/admin-x-framework/errors';
import { toSaveError } from './error-mapping';

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
    ['a server error', new JSONError(response(500), errorBody()), 'unknown'],
    ['a thrown non-error', 'broken', 'unknown'],
  ])('maps %s', (_label, error, kind) => {
    expect(toSaveError(error, 'fallback').kind).toBe(kind);
  });

  it('keeps the fallback message when the failure carries none', () => {
    expect(toSaveError({}, 'Could not save').message).toBe('Could not save');
  });

  it('carries the cause for reporting', () => {
    const error = new ServerUnreachableError();
    expect(toSaveError(error, 'fallback').cause).toBe(error);
  });

  it('reads a collision ahead of the status it arrives with', () => {
    // Core answers 409 for UPDATE_COLLISION, which no framework error class claims.
    const collision = new JSONError(response(409), errorBody({ code: 'UPDATE_COLLISION' }));
    expect(toSaveError(collision, 'fallback').kind).toBe('conflict');
  });
});
