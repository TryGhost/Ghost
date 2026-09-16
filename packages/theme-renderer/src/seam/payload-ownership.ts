/**
 * Dev/test-time enforcement of the ContentApiPort OWNERSHIP CONTRACT
 * (see ./types.ts): every controller call must return freshly-owned JSON,
 * because the render pipeline mutates responses in place (fetch-data attaches
 * `.data`, prepareContextResource rewrites resources) without defensive
 * copies.
 *
 * The check is a WeakSet of every payload object a port has handed out — if
 * the same object reference ever comes back a second time, the port is
 * sharing state across calls and the render that would silently corrupt it
 * fails loudly instead.
 *
 * Enabled by default under test/dev NODE_ENV only (build-safe read: the
 * browser bundle sees the process-env-guard's empty env → disabled), so
 * production renders pay nothing beyond a boolean check.
 */
import errors from '@tryghost/errors';

const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
  ?.NODE_ENV;

const ASSERT_FRESH_PAYLOADS = env === 'testing' || env === 'development';

const seenPayloads = new WeakSet<object>();

function assertFreshPayload(payload: unknown, source: string): void {
  if (typeof payload !== 'object' || payload === null) {
    return;
  }
  if (seenPayloads.has(payload)) {
    throw new errors.IncorrectUsageError({
      message: `@tryghost/theme-renderer: ContentApiPort ${source} returned the same payload object twice — the ownership contract (seam/types.ts) requires freshly-owned JSON per call`,
    });
  }
  seenPayloads.add(payload);
}

/**
 * Wraps a ContentApiPort controller so every promise-returning method call
 * asserts its resolved payload has never been handed out before. Returns the
 * controller unchanged when assertions are disabled or the value is not a
 * wrappable object.
 */
export function withPayloadOwnershipAssertion<T>(controller: T, controllerName: string): T {
  if (!ASSERT_FRESH_PAYLOADS || typeof controller !== 'object' || controller === null) {
    return controller;
  }
  return new Proxy(controller as object, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (typeof value !== 'function') {
        return value;
      }
      return function wrapped(this: unknown, ...args: unknown[]) {
        const result = value.apply(target, args);
        if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
          return Promise.resolve(result).then((payload) => {
            assertFreshPayload(payload, `${controllerName}.${String(property)}`);
            return payload;
          });
        }
        return result;
      };
    },
  }) as T;
}
