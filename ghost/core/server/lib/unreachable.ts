import errors from '@tryghost/errors';

/**
 * Throws for a value its type rules out, such as in the `default` case of a switch that handles
 * every member of a union. The call only compiles while `value` is `never`, so adding a member to
 * the union makes every switch that doesn't handle it a type error.
 *
 * At runtime it can only be reached by a JavaScript caller or by data that doesn't match its type,
 * which is a bug in Ghost rather than a bad request, so it throws a server error.
 */
export function unreachable(value: never, what: string): never {
  throw new errors.InternalServerError({ message: `Unhandled ${what}: ${describe(value)}` });
}

function describe(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}
