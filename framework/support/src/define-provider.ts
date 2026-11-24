import type { AnyServiceDefinition, ServiceDefinition } from '#support/define-service';

/** The part of an event emitter a declared listener is subscribed through. */
export interface ListenerBus {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, listener: (...args: any[]) => void): unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  removeListener(event: string, listener: (...args: any[]) => void): unknown;
}

/**
 * Declares that a service reacts to an event. The service is built when the
 * first event arrives, not when the listener is declared.
 */
export interface ListenerDeclaration {
  readonly bus: ServiceDefinition<ListenerBus>;
  readonly event: string;
  readonly service: AnyServiceDefinition;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly handle: (service: any, ...args: any[]) => unknown;
}

/** Helper that types `handle` from the service definition it names. */
export function listen<Service>(declaration: {
  readonly bus: ServiceDefinition<ListenerBus>;
  readonly event: string;
  readonly service: ServiceDefinition<Service, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly handle: (service: Service, ...args: any[]) => unknown;
}): ListenerDeclaration {
  return Object.freeze({ ...declaration });
}

/** The one place a module plugs itself into the application. It only declares. */
export interface Provider {
  readonly name: string;
  readonly services: readonly AnyServiceDefinition[];
  readonly listeners: readonly ListenerDeclaration[];
}

export function defineProvider(provider: {
  readonly name: string;
  readonly services?: readonly AnyServiceDefinition[];
  readonly listeners?: readonly ListenerDeclaration[];
}): Provider {
  return Object.freeze({
    name: provider.name,
    services: Object.freeze([...(provider.services ?? [])]),
    listeners: Object.freeze([...(provider.listeners ?? [])]),
  });
}
