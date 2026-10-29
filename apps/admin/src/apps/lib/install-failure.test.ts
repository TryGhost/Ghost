import { describe, expect, it } from 'vitest';
import {
  type ErrorResponse,
  ServerUnreachableError,
  ValidationError,
} from '@tryghost/admin-x-framework/errors';
import { installFailureOf } from './install-failure';

/**
 * An error as Ghost answers a preview, install or approval with: its error handler replaces
 * the server's message with a generic one, and puts it at the start of `context`.
 */
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
        'Could not load the app’s manifest. https://podcast.example.com/ghost-app.json answered with HTTP 503',
      ),
    );

    expect(failure).toEqual({
      kind: 'unreachable',
      detail:
        'Could not load the app’s manifest. https://podcast.example.com/ghost-app.json answered with HTTP 503',
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
    const failure = installFailureOf(
      apiError('APP_MANIFEST_INVALID', 'The app manifest is not valid. id: Expected an ID'),
    );

    expect(failure).toEqual({
      kind: 'problems',
      problems: [
        {
          title: 'The app’s details aren’t valid',
          detail: 'The app manifest is not valid. id: Expected an ID',
        },
      ],
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

  it('says what went wrong for anything else', () => {
    expect(installFailureOf(new ServerUnreachableError())).toEqual({
      kind: 'error',
      message: 'Something went wrong. Please try again.',
    });
  });

  it('refuses another developer’s app without saying more', () => {
    expect(installFailureOf(apiError('APP_IDENTITY_MISMATCH', 'Anything'))).toEqual({
      kind: 'another-developer',
    });
  });

  it.each([
    'APP_MANIFEST_SIGNATURE_INVALID',
    'APP_MANIFEST_OUTDATED',
    'APP_MANIFEST_CONFLICT',
    'APP_CHALLENGE_FAILED',
  ])(
    'says Ghost couldn’t confirm where the app comes from on %s, with the app’s answer',
    (code) => {
      const context =
        'Ghost couldn’t confirm the app comes from its developer. https://podcast.example.com: The signature was not made with backend_key';
      expect(installFailureOf(apiError(code, context))).toEqual({
        kind: 'unconfirmed',
        detail: context,
      });
    },
  );

  it('lets the publisher try again when the app’s backend does not answer', () => {
    expect(
      installFailureOf(
        apiError(
          'APP_CHALLENGE_UNREACHABLE',
          'Could not reach the app to confirm it comes from its developer. https://podcast.example.com',
        ),
      ),
    ).toEqual({
      kind: 'unreachable',
      detail:
        'Could not reach the app to confirm it comes from its developer. https://podcast.example.com',
    });
  });

  it.each([
    ['APP_MANIFEST_UNSIGNED', 'The app’s details aren’t signed'],
    ['APP_MANIFEST_URL_MISMATCH', 'The app’s details are for another install link'],
  ])('lists %s for the app’s developer', (code, title) => {
    expect(installFailureOf(apiError(code, 'What Ghost found'))).toEqual({
      kind: 'problems',
      problems: [{ title, detail: 'What Ghost found' }],
    });
  });
});
