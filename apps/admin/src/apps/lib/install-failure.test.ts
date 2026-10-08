import { describe, expect, it } from 'vitest';
import {
  type ErrorResponse,
  JSONError,
  ServerUnreachableError,
  ValidationError,
} from '@tryghost/admin-x-framework/errors';
import { installFailureOf } from './install-failure';

const apiError = (code: string, context: string, details: unknown = null) => {
  const data = {
    errors: [
      {
        code,
        context,
        details,
        ghostErrorCode: null,
        help: '',
        id: 'error-id',
        message: 'Validation error, cannot save app installation preview.',
        property: null,
        type: 'ValidationError',
      },
    ],
  };
  // `ErrorResponse` types `details` as a string, but Ghost sends whatever the error carries.
  return new ValidationError(new Response(), data as unknown as ErrorResponse);
};

describe('installFailureOf', () => {
  it('lets the publisher try again when the app does not answer', () => {
    const failure = installFailureOf(
      apiError(
        'APP_MANIFEST_UNREACHABLE',
        'https://podcast.example.com/ghost-app.json answered with HTTP 503',
      ),
    );

    expect(failure).toEqual({
      kind: 'unreachable',
      detail: 'https://podcast.example.com/ghost-app.json answered with HTTP 503',
    });
  });

  it('lists each problem with the manifest for the developer', () => {
    const failure = installFailureOf(
      apiError('APP_MANIFEST_INVALID', 'id: Expected an ID; name: Expected a name', [
        { path: 'id', message: 'Expected an ID' },
        { path: '', message: 'Expected an object' },
      ]),
    );

    expect(failure).toEqual({
      kind: 'problems',
      problems: [
        { title: 'id', detail: 'Expected an ID' },
        { title: 'Manifest', detail: 'Expected an object' },
      ],
    });
  });

  it('falls back to the summary when an invalid manifest comes without details', () => {
    const failure = installFailureOf(apiError('APP_MANIFEST_INVALID', 'id: Expected an ID'));

    expect(failure).toEqual({
      kind: 'problems',
      problems: [{ title: 'The app’s details aren’t valid', detail: 'id: Expected an ID' }],
    });
  });

  it.each([
    ['APP_MANIFEST_URL_INVALID', 'The install link isn’t valid'],
    ['APP_MANIFEST_REDIRECTED', 'The app’s details redirect to another site'],
    ['APP_MANIFEST_NOT_JSON', 'The app’s details aren’t in the expected format'],
    ['APP_MANIFEST_TOO_LARGE', 'The app’s details are too large'],
    ['APP_MANIFEST_OTHER_APP', 'This install link is for a different app'],
  ])('explains %s as a problem for the developer', (code, title) => {
    expect(installFailureOf(apiError(code, 'what Ghost said'))).toEqual({
      kind: 'problems',
      problems: [{ title, detail: 'what Ghost said' }],
    });
  });

  it('recognises a Ghost too old to install apps', () => {
    const notFound = new JSONError(
      new Response(null, { status: 404 }),
      undefined,
      'Resource not found',
    );

    expect(installFailureOf(notFound)).toEqual({ kind: 'unsupported' });
  });

  it('says what went wrong for anything else', () => {
    expect(installFailureOf(new ServerUnreachableError())).toEqual({
      kind: 'error',
      message: 'Something went wrong. Please try again.',
    });
  });
});
