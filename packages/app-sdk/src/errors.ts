import { HOST_ERROR_CODES, decodeBridgeError, type BridgeErrorCode } from '@tryghost/app-contracts';

/**
 * Why an SDK call failed:
 *
 * - `not_framed`: The page isn't framed in Admin, so there's nothing to connect to.
 * - `not_connected`: Admin didn't start the app in time.
 * - `duplicate_sdk`: Another copy of the SDK in the page has already connected, or tried to,
 *   because the page loads the SDK more than once. Load a single copy for the whole page.
 * - `invalid_context`: Admin started the app with a context this SDK can't read. Updating the
 *   SDK usually fixes it.
 * - `session_ended`: This document has left the app session, usually because the page reloaded
 *   or navigated away, or the session has ended. Every call fails after that.
 * - `invalid_argument`: The app passed something that can't be sent.
 * - `invalid_path`: A path that isn't an Admin API path or a route within the app, or
 *   one the Admin API only redirects, such as a path without its trailing `/`.
 * - `unsupported`: This site's version of Ghost doesn't have the call the app made yet. The
 *   SDK knows this from the calls Admin listed when it connected.
 * - `blocked`: Admin refused by policy, such as a request the allowlist doesn't allow.
 * - `network_error`: Admin couldn't reach its own API.
 * - `rejected`: Admin refused for another reason. The message says why.
 *
 * `not_framed`, `not_connected`, `duplicate_sdk` and `unsupported` are the SDK's own codes. The
 * rest are bridge codes, which cross the channel.
 */
export type GhostAppErrorCode =
  | 'not_framed'
  | 'not_connected'
  | 'duplicate_sdk'
  | 'unsupported'
  | BridgeErrorCode;

/** The only error type the SDK rejects with, so an app can branch on `code`. */
export class GhostAppError extends Error {
  readonly code: GhostAppErrorCode;

  constructor(code: GhostAppErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'GhostAppError';
    this.code = code;
  }
}

/**
 * Converts whatever a call to Admin rejected with into a `GhostAppError`, with the code Admin
 * gave or, if there is none, `rejected` with Admin's message.
 */
export function fromHostError(error: unknown, operation: string): GhostAppError {
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String(error.message)
      : undefined;
  if (message === undefined) {
    return new GhostAppError('rejected', `Ghost refused ${operation}`, { cause: error });
  }
  // Only the codes Admin refuses with are parsed; any other prefix stays part of the message.
  const coded = decodeBridgeError(message, HOST_ERROR_CODES);
  if (coded) {
    return new GhostAppError(coded.code, coded.detail, { cause: error });
  }
  return new GhostAppError('rejected', message, { cause: error });
}

export function invalidArgument(message: string): GhostAppError {
  return new GhostAppError('invalid_argument', message);
}

export function invalidPath(message: string): GhostAppError {
  return new GhostAppError('invalid_path', message);
}

export function unsupported(operation: string): GhostAppError {
  return new GhostAppError('unsupported', `This site's Ghost doesn't support ${operation} yet`);
}

export function sessionEnded(): GhostAppError {
  return new GhostAppError('session_ended', 'The session with Ghost has ended');
}
