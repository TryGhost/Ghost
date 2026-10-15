import { type HostErrorCode, encodeBridgeError } from '@tryghost/app-contracts/bridge';
import type { z } from 'zod';

/**
 * The error Admin refuses a call from an app's page with. It carries one of the bridge's codes,
 * which the SDK turns into an error the app can branch on. Only an error's message survives the
 * channel, so the code is encoded in the message, as the contract defines.
 */
export class BridgeError extends Error {
  readonly code: HostErrorCode;

  constructor(code: HostErrorCode, detail: string) {
    super(encodeBridgeError(code, detail));
    this.name = 'BridgeError';
    this.code = code;
  }
}

/** The error Admin refuses every running or later call with once the session ends. */
export const sessionEnded = () => new BridgeError('session_ended', 'The app’s session ended');

/**
 * Parses a value a frame sent, which Admin never trusts. If the value is invalid, throws a
 * `BridgeError` with the schema's first message. `code` sets the error's code, optionally from the
 * path of the invalid part of the value, so an app can tell a bad path from a bad call.
 */
export function parseFromFrame<Schema extends z.ZodType>(
  schema: Schema,
  value: unknown,
  code: HostErrorCode | ((path: PropertyKey[]) => HostErrorCode) = 'invalid_argument',
): z.output<Schema> {
  const result = schema.safeParse(value);
  if (result.success) {
    return result.data;
  }
  const [issue] = result.error.issues;
  throw new BridgeError(
    typeof code === 'function' ? code(issue?.path ?? []) : code,
    issue?.message ?? 'Expected a valid argument',
  );
}
