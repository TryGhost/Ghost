import { HOST_ERROR_CODES, decodeBridgeError, type BridgeErrorCode } from '@tryghost/app-contracts';

/**
 * Why something the SDK was asked to do did not happen:
 *
 * - `not_framed`: the page is not inside Admin, so there is nobody to talk to.
 * - `not_connected`: Admin did not start the app in time.
 * - `invalid_context`: Admin started the app with a context this SDK cannot read.
 * - `session_ended`: the channel to Admin is gone; the page is about to be replaced.
 * - `invalid_argument`: the app passed something that cannot be sent.
 * - `invalid_path`: a path that is not an Admin API path, or not a route within the app; or
 *   one the Admin API only redirects, such as a path without its trailing `/` or with
 *   capitals, as Admin API paths are lowercase and end in `/`.
 * - `unsupported`: this site's Ghost is older than the call the app made.
 * - `blocked`: Admin refused on principle, such as an Admin API route apps may not reach.
 * - `network_error`: Admin could not reach its own API.
 * - `rejected`: Admin refused for any other reason; the message says why.
 *
 * The first two describe the channel itself, which only the SDK knows about; the rest are the
 * bridge's codes, which cross it.
 */
export type GhostAppErrorCode = 'not_framed' | 'not_connected' | BridgeErrorCode;

/** The one error the SDK rejects with, so an app can branch on `code`. */
export class GhostAppError extends Error {
  readonly code: GhostAppErrorCode;

  constructor(code: GhostAppErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'GhostAppError';
    this.code = code;
  }
}

// What `@quilted/threads` throws on the other side when a call names nothing it exports.
const MISSING_EXPORT = /^No '[^']*' method is exported from this thread$/;

/**
 * Turns whatever a call to Admin rejected with into a `GhostAppError`: the code Admin gave,
 * `unsupported` when Admin has no such call, or else a refusal with Admin's message.
 */
export function fromHostError(error: unknown, operation: string): GhostAppError {
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String(error.message)
      : undefined;
  if (message === undefined) {
    return new GhostAppError('rejected', `Ghost refused ${operation}`, { cause: error });
  }
  // Only the codes Admin refuses with are read; anything else is part of what it said.
  const coded = decodeBridgeError(message, HOST_ERROR_CODES);
  if (coded) {
    return new GhostAppError(coded.code, coded.detail, { cause: error });
  }
  if (MISSING_EXPORT.test(message)) {
    const unsupported = `This site's Ghost doesn't support ${operation} yet`;
    return new GhostAppError('unsupported', unsupported, { cause: error });
  }
  return new GhostAppError('rejected', message, { cause: error });
}

export function invalidArgument(message: string): GhostAppError {
  return new GhostAppError('invalid_argument', message);
}

export function invalidPath(message: string): GhostAppError {
  return new GhostAppError('invalid_path', message);
}

export function sessionEnded(): GhostAppError {
  return new GhostAppError('session_ended', 'The session with Ghost has ended');
}
