import { defineService, shortestLifetime } from '#support/define-service';
import type { Needs, Resolved, ServiceDefinition } from '#support/define-service';

/**
 * Describes something a module does when asked. `handle` is given what the
 * action needs, then the caller's arguments.
 *
 * Other code names the action in its own `needs` and is handed a function to call.
 * An action keeps no state, so it lives as long as the shortest-lived thing it needs.
 */
export function defineAction<
  Args extends unknown[],
  Result,
  const N extends Needs = Record<never, never>,
>(action: {
  readonly name: string;
  readonly needs?: N;
  readonly handle: (needs: Resolved<N>, ...args: Args) => Result;
}): ServiceDefinition<(...args: Args) => Result, N> {
  return defineService({
    name: action.name,
    lifetime: shortestLifetime(action.needs ?? {}),
    needs: action.needs,
    create:
      (needs) =>
      (...args: Args) =>
        action.handle(needs, ...args),
  });
}
