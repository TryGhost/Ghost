import { type BridgeErrorCode, encodeBridgeError } from '@tryghost/app-contracts/bridge';
import type { z } from 'zod';

/**
 * A call from an app's page that Admin refuses, with one of the bridge's codes, which the
 * SDK turns into an error the app can branch on. Only an error's message survives the
 * channel, so the code travels in it, encoded as the contract says.
 */
export class BridgeError extends Error {
  readonly code: BridgeErrorCode;

  constructor(code: BridgeErrorCode, detail: string) {
    super(encodeBridgeError(code, detail));
    this.name = 'BridgeError';
    this.code = code;
  }
}

/**
 * Parses what a frame sent, which Admin never trusts, refusing it with the schema's first
 * message. `code` says what a refusal is called, from the part of the value at fault, so
 * an app can tell a bad path from a bad call.
 */
export function parseFromFrame<Schema extends z.ZodType>(
  schema: Schema,
  value: unknown,
  code: BridgeErrorCode | ((path: PropertyKey[]) => BridgeErrorCode) = 'invalid_argument',
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
