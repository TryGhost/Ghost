import { IncorrectUsageError } from '@tryghost/errors';

type CreateService<Service> = () => Service | Promise<Service>;

/** Separates what a service builds once from what it acquires on each boot. */
export interface ServiceLifecycle<Service> {
  /** Builds the instance once per process. The instance is retained across stop(). */
  readonly create: CreateService<Service>;
  /** Acquires listeners, timers and the like. Runs after `create`, and on each init() after a stop(). */
  readonly start?: (service: Service) => unknown;
  /** Releases what `start` acquired. Also cleans up a failed `start`, so it must be safe after a partial one. */
  readonly stop?: (service: Service) => unknown;
}

interface ServiceRoot<Service> {
  readonly init: () => Promise<void>;
  readonly stop: () => Promise<void>;
  readonly service: Service;
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
export function defineService<Service>(
  name: string,
  definition: CreateService<Service> | ServiceLifecycle<Service>,
): ServiceRoot<Service>;
export function defineService<Service, Extras extends object>(
  name: string,
  definition: CreateService<Service> | ServiceLifecycle<Service>,
  extras: Extras,
): ServiceRoot<Service> & { readonly extras: Extras };
export function defineService<Service, Extras extends object>(
  name: string,
  definition: CreateService<Service> | ServiceLifecycle<Service>,
  extras?: Extras,
) {
  const lifecycle: ServiceLifecycle<Service> =
    typeof definition === 'function' ? { create: definition } : definition;

  let created: { readonly service: Service } | undefined;
  // Set by the first successful start; stop() does not clear it.
  let ready = false;
  let started = false;
  let initialization: Promise<void> | undefined;

  async function startService(): Promise<void> {
    const { service } = (created ??= { service: await lifecycle.create() });
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
    init(): Promise<void> {
      initialization ??= startService().catch((error) => {
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
