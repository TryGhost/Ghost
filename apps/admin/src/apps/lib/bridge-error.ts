import type { z } from 'zod';

/**
 * What a call from an app's page can fail with. The SDK turns each into an error the app
 * can branch on.
 */
export type BridgeErrorCode =
  | 'invalid_argument'
  | 'invalid_path'
  | 'blocked'
  | 'network_error'
  | 'session_ended';

/**
 * Only an error's message survives the channel: the structured clone that carries it drops
 * every other property, and any `name` but the built-in ones. So the code leads the
 * message, as `code: what went wrong`, for the SDK to read back.
 */
export class BridgeError extends Error {
  readonly code: BridgeErrorCode;

  constructor(code: BridgeErrorCode, detail: string) {
    super(`${code}: ${detail}`);
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
