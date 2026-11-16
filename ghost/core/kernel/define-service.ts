import { IncorrectUsageError } from '@tryghost/errors';

type CreateService<Service, Dependencies = void> = (
  dependencies: Dependencies,
) => Service | Promise<Service>;

/** Separates what a service builds once from what it acquires on each boot. */
export interface ServiceLifecycle<Service, Dependencies = void> {
  /**
   * Builds the instance once per process. The instance is retained across stop().
   * A root started by the domain layer receives what its domain file supplies.
   */
  readonly create: CreateService<Service, Dependencies>;
  /** Acquires listeners, timers and the like. Runs after `create`, and on each init() after a stop(). */
  readonly start?: (service: Service) => unknown;
  /** Releases what `start` acquired. Also cleans up a failed `start`, so it must be safe after a partial one. */
  readonly stop?: (service: Service) => unknown;
  /**
   * Other roots in the same domain that must have started first, by folder name.
   * Only the domain layer reads this; boot.js orders the roots it initializes.
   */
  readonly startAfter?: readonly string[];
  /**
   * False when starting does not block boot: the domain layer starts the root
   * after Ghost is ready. `.service` throws until then.
   */
  readonly blocking?: boolean;
}

interface ServiceRoot<Service, Dependencies = void> {
  readonly init: (dependencies?: Dependencies) => Promise<void>;
  readonly stop: () => Promise<void>;
  readonly service: Service;
  readonly startAfter: readonly string[];
  readonly blocking: boolean;
}

/**
 * Provides init(), stop() and a .service getter for one application-owned instance.
 *
 * @param name - Service name used when reporting access before initialization.
 * @param definition - A `create` callback returning a fully initialized instance,
 * synchronously or asynchronously, or a {@link ServiceLifecycle} that adds `start` and
 * `stop` hooks. If `create` fails after acquiring resources it must release them before
 * throwing or rejecting; defineService can only clean up a failed `start`.
 * An optional extras object groups transitional helpers without invoking them.
 * @see [Service initialization](./README.md#service-initialization)
 */
export function defineService<Service, Dependencies = void>(
  name: string,
  definition: CreateService<Service, Dependencies> | ServiceLifecycle<Service, Dependencies>,
): ServiceRoot<Service, Dependencies>;
export function defineService<Service, Extras extends object>(
  name: string,
  definition: CreateService<Service> | ServiceLifecycle<Service>,
  extras: Extras,
): ServiceRoot<Service> & { readonly extras: Extras };
export function defineService<Service, Extras extends object, Dependencies = void>(
  name: string,
  definition: CreateService<Service, Dependencies> | ServiceLifecycle<Service, Dependencies>,
  extras?: Extras,
) {
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
      await lifecycle.start?.(service);
    } catch (error) {
      await lifecycle.stop?.(service);
      throw error;
    }
    ready = true;
    started = true;
  }

  const root = {
    init(dependencies?: Dependencies): Promise<void> {
      // Boot calls init() with nothing; only the domain layer supplies dependencies.
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

  // What the root declares about starting is read by the domain layer only, so
  // it stays out of the root's enumerable surface: init, stop, service, extras.
  Object.defineProperties(root, {
    startAfter: { value: Object.freeze([...(lifecycle.startAfter ?? [])]) },
    blocking: { value: lifecycle.blocking ?? true },
  });

  return extras === undefined ? root : Object.assign(root, { extras });
}
