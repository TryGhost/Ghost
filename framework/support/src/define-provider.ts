import type { ListenerDefinition } from '#support/define-listener';
import type { AnyServiceDefinition } from '#support/define-service';

/** The one place a module plugs itself into the application. It only declares. */
export interface Provider {
  readonly name: string;
  /** Logic the module keeps to itself and shares between its own actions and listeners. */
  readonly services: readonly AnyServiceDefinition[];
  /** What other modules may ask this one to do. */
  readonly actions: readonly AnyServiceDefinition[];
  /** What this module does when something happens. */
  readonly listeners: readonly ListenerDefinition[];
}

export function defineProvider(provider: {
  readonly name: string;
  readonly services?: readonly AnyServiceDefinition[];
  readonly actions?: readonly AnyServiceDefinition[];
  readonly listeners?: readonly ListenerDefinition[];
}): Provider {
  return Object.freeze({
    name: provider.name,
    services: Object.freeze([...(provider.services ?? [])]),
    actions: Object.freeze([...(provider.actions ?? [])]),
    listeners: Object.freeze([...(provider.listeners ?? [])]),
  });
}
