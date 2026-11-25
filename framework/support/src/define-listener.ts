import type { Needs, Resolved, ServiceDefinition } from '#support/define-service';

/** The part of an event emitter a listener is subscribed through. */
export interface ListenerBus {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, listener: (...args: any[]) => void): unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  removeListener(event: string, listener: (...args: any[]) => void): unknown;
}

/**
 * Describes what a module does when something happens. `handle` is given what
 * the listener needs, then the event's arguments. What it needs is built when
 * the first event arrives, not when the listener is declared.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ListenerDefinition<N extends Needs = any, Args extends unknown[] = any[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly bus: ServiceDefinition<ListenerBus, any>;
  readonly event: string;
  readonly needs: N;
  readonly handle: (needs: Resolved<N>, ...args: Args) => unknown;
}

export function defineListener<
  Args extends unknown[],
  const N extends Needs = Record<never, never>,
>(listener: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly bus: ServiceDefinition<ListenerBus, any>;
  readonly event: string;
  readonly needs?: N;
  readonly handle: (needs: Resolved<N>, ...args: Args) => unknown;
}): ListenerDefinition<N, Args> {
  return Object.freeze({
    bus: listener.bus,
    event: listener.event,
    needs: Object.freeze({ ...listener.needs }) as N,
    handle: listener.handle,
  });
}
