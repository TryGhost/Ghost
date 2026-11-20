import { IncorrectUsageError } from '@tryghost/errors';
import type { Foundation } from './foundation';

/**
 * Something a definition can name in `needs`: another definition, or a root
 * that still holds its own instance and is read through `.service`.
 */
export type Needed<Service> = ServiceDefinition<Service, any> | { readonly service: Service };

/** What `create` is handed: the foundation, and the instance of each thing in `needs`. */
export type Given<Needs> = 0 extends 1 & Needs
  ? any
  : { readonly foundation: Foundation } & {
      readonly [Name in keyof Needs]: Needs[Name] extends Needed<infer Service> ? Service : never;
    };

/**
 * An event the service handles, declared so that whoever builds the service
 * can listen before the service exists and build it when the event arrives.
 */
export interface ServiceListener<Service> {
  /** The event's class, as the event bus keys it. */
  readonly event: { readonly name: string };
  // `never` lets each listener name the type of the event it expects.
  readonly handle: (service: Service, event: never) => unknown;
}

/**
 * How to build one service. It holds no instance: whoever builds from it keeps
 * what it built.
 */
export interface ServiceDefinition<Service, Needs = object> {
  readonly name: string;
  /** What `create` is handed besides the foundation, by the name it is handed under. */
  readonly needs?: Needs;
  /** Builds the instance. Runs the first time the service is used. */
  readonly create: (given: Given<Needs>) => Service | Promise<Service>;
  /** Events delivered to the service. They build it if nothing has yet. */
  readonly listeners?: readonly ServiceListener<Service>[];
  /** Long-running work. Runs only when the application starts the service. */
  readonly start?: (service: Service, given: Given<Needs>) => unknown;
  /** Releases what `start` acquired. Also runs after a failed `start`. */
  readonly stop?: (service: Service) => unknown;
}

type CreateService<Service, Dependencies = void> = (
  dependencies: Dependencies,
) => Service | Promise<Service>;

/** Separates what a service builds once from what it acquires on each boot. */
export interface ServiceLifecycle<Service, Dependencies = void> {
  /**
   * Builds the instance once per process. The instance is retained across stop().
   * A root the start sequence hands something to (a shared module) receives it here.
   */
  readonly create: CreateService<Service, Dependencies>;
  /** Acquires listeners, timers and the like. Runs after `create`, and on each init() after a stop(). */
  readonly start?: (service: Service, dependencies: Dependencies) => unknown;
  /** Releases what `start` acquired. Also cleans up a failed `start`, so it must be safe after a partial one. */
  readonly stop?: (service: Service) => unknown;
}

export interface ServiceRoot<Service, Dependencies = void> {
  readonly init: (dependencies?: Dependencies) => Promise<void>;
  readonly stop: () => Promise<void>;
  readonly service: Service;
}

/**
 * Describes how to build a service, or (the older form, with a name first)
 * provides init(), stop() and a .service getter for one instance the root holds.
 *
 * Given one object, it returns that object as a {@link ServiceDefinition}:
 * nothing is built and nothing is kept. The application builds the service the
 * first time it is used and keeps the instance.
 *
 * The form with a name first is transitional. It holds its instance, so there
 * is one per process, and it must be started before it is read.
 *
 * @param name - Service name used when reporting access before initialization.
 * @param definition - A `create` callback returning a fully initialized instance,
 * synchronously or asynchronously, or a {@link ServiceLifecycle} that adds `start` and
 * `stop` hooks. If `create` fails after acquiring resources it must release them before
 * throwing or rejecting; defineService can only clean up a failed `start`.
 * An optional extras object groups transitional helpers without invoking them.
 * @see [Service initialization](./README.md#service-initialization)
 */
export function defineService<
  Service,
  const Needs extends Record<string, Needed<any>> = Record<never, never>,
>(definition: ServiceDefinition<Service, Needs>): ServiceDefinition<Service, Needs>;
export function defineService<Service, Dependencies = void>(
  name: string,
  definition: CreateService<Service, Dependencies> | ServiceLifecycle<Service, Dependencies>,
): ServiceRoot<Service, Dependencies>;
export function defineService<Service, Extras extends object, Dependencies = void>(
  name: string,
  definition: CreateService<Service, Dependencies> | ServiceLifecycle<Service, Dependencies>,
  extras: Extras,
): ServiceRoot<Service, Dependencies> & { readonly extras: Extras };
export function defineService<Service, Extras extends object, Dependencies = void>(
  name: string | ServiceDefinition<Service, any>,
  definition?: CreateService<Service, Dependencies> | ServiceLifecycle<Service, Dependencies>,
  extras?: Extras,
) {
  if (typeof name !== 'string') {
    return name;
  }
  if (definition === undefined) {
    throw new IncorrectUsageError({ message: `${name} has no definition.` });
  }
  const lifecycle: ServiceLifecycle<Service, Dependencies> =
    typeof definition === 'function' ? { create: definition } : definition;

  let created: { readonly service: Service } | undefined;
  // Set by the first successful start; stop() does not clear it.
  let ready = false;
  let started = false;
  let initialization: Promise<void> | undefined;

  async function startService(dependencies: Dependencies): Promise<void> {
    const { service } = (created ??= { service: await lifecycle.create(dependencies) });
    try {
      await lifecycle.start?.(service, dependencies);
    } catch (error) {
      await lifecycle.stop?.(service);
      throw error;
    }
    ready = true;
    started = true;
  }

  const root = {
    init(dependencies?: Dependencies): Promise<void> {
      // Only the start sequence supplies dependencies, and only to a root that declares them.
      initialization ??= startService(dependencies as Dependencies).catch((error) => {
        initialization = undefined;
        throw error;
      });
      return initialization;
    },
    async stop(): Promise<void> {
      if (!started || created === undefined) {
        return;
      }
      started = false;
      initialization = undefined;
      await lifecycle.stop?.(created.service);
    },
    get service(): Service {
      if (!ready || created === undefined) {
        throw new IncorrectUsageError({
          message: `${name} used before init(). Call init() from boot first.`,
        });
      }
      return created.service;
    },
  };

  return extras === undefined ? root : Object.assign(root, { extras });
}
