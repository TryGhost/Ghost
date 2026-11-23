import type { EventKey, Foundation } from './foundation.ts';

/** Any definition, whatever it builds and needs. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- each definition names its own types
export type AnyServiceDefinition = ServiceDefinition<any, any>;

/** A definition of this service, whatever it needs. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- each definition names its own needs
export type ServiceDefinitionOf<Service> = ServiceDefinition<Service, any>;

/** What a definition can name in `needs`: other definitions, by the name each is handed under. */
export type ServiceNeeds = Readonly<Record<string, AnyServiceDefinition>>;

/** What `create` and `start` are handed: the foundation, and the instance of each need. */
export type Given<Needs extends ServiceNeeds = ServiceNeeds> = 0 extends 1 & Needs
  ? // Untyped needs give an untyped object, so that any definition is an AnyServiceDefinition.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  : { readonly foundation: Foundation } & {
      readonly [Name in keyof Needs]: Needs[Name] extends ServiceDefinitionOf<infer Service>
        ? Service
        : never;
    };

/**
 * An event the service handles. Declared, so that whoever builds the service can listen before
 * the service exists and build it when the event arrives.
 */
export interface ServiceListener<Service> {
  /** What the event is dispatched under: the class of a typed event, or any object with a name. */
  readonly event: EventKey;
  // `never` lets each listener name the arguments it expects.
  readonly handle: (service: Service, ...payload: never[]) => unknown;
}

/**
 * A service is built synchronously. A `create` that returns a promise fails to compile against
 * this: what it waits for belongs in `start`.
 */
type Synchronous<Service> =
  Service extends PromiseLike<unknown>
    ? { readonly create: 'must be synchronous: move what it waits for into start' }
    : unknown;

/** The options of a definition. Only `create` is required. */
export interface ServiceOptions<Service, Needs extends ServiceNeeds = Record<never, never>> {
  /** Other services `create` is handed, by the name each is handed under. */
  readonly needs?: Needs;
  /**
   * Builds the instance, synchronously, the first time the service is used. It reads what it is
   * given and builds; it does not subscribe, schedule or wait.
   */
  readonly create: (given: Given<Needs>) => Service;
  /** Events delivered to the service. One arriving builds the service if nothing has yet. */
  readonly listeners?: readonly ServiceListener<Service>[];
  /**
   * Work that runs with no caller behind it, such as polling or a check that must finish before
   * the application serves. Runs only when the application starts the service, and may be awaited.
   */
  readonly start?: (service: Service, given: Given<Needs>) => unknown;
  /** Releases what `start` acquired. Also runs after a failed `start`, so it must be safe then. */
  readonly stop?: (service: Service) => unknown;
}

/**
 * How to build one service. It describes and holds nothing: whoever builds from it keeps what it
 * built, so one definition can be built once for each application that uses it.
 */
export interface ServiceDefinition<Service, Needs extends ServiceNeeds = Record<never, never>> {
  /** Names the service in errors and logs. */
  readonly name: string;
  readonly needs: Needs;
  readonly create: (given: Given<Needs>) => Service;
  readonly listeners: readonly ServiceListener<Service>[];
  readonly start?: (service: Service, given: Given<Needs>) => unknown;
  readonly stop?: (service: Service) => unknown;
}

/** The extras a definition was given, kept under `extras`. */
type WithExtras<Extras> = Extras extends object ? { readonly extras: Extras } : unknown;

/**
 * Describes how to build a service. Nothing is built and nothing is kept: the application builds
 * the service the first time it is used and holds the instance until it stops.
 *
 * @param name - Names the service in errors and logs.
 * @param definition - A `create` callback, or {@link ServiceOptions} to add `needs`, `listeners`,
 * `start` and `stop`. A service that uses none of the options is complete without them.
 * @param extras - Transitional helpers that accompany a service root, kept as given.
 * @see [Services](../README.md#services)
 */
export function defineService<
  Service,
  const Needs extends ServiceNeeds = Record<never, never>,
  Extras extends object | undefined = undefined,
>(
  name: string,
  definition: ((() => Service) | ServiceOptions<Service, Needs>) & Synchronous<Service>,
  extras?: Extras,
): ServiceDefinition<Service, Needs> & WithExtras<Extras> {
  const options: ServiceOptions<Service, Needs> =
    typeof definition === 'function' ? { create: definition } : definition;
  const described: ServiceDefinition<Service, Needs> & { extras?: Extras } = {
    name,
    // An empty object when the definition names no needs.
    needs: options.needs ?? ({} as Needs),
    create: options.create,
    listeners: options.listeners ?? [],
    ...(options.start ? { start: options.start } : {}),
    ...(options.stop ? { stop: options.stop } : {}),
    ...(extras === undefined ? {} : { extras }),
  };
  return described as ServiceDefinition<Service, Needs> & WithExtras<Extras>;
}
